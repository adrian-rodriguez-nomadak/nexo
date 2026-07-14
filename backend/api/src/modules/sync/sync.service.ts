import { Op } from "sequelize";

import { requireUserId } from "../../shared/auth/user-context.js";
import { sequelize } from "../../shared/db/sequelize.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { SyncChange } from "./sync-change.model.js";
import { SyncRecord } from "./sync-record.model.js";

type IncomingChange = {
  operation_id: string;
  entity: string;
  record_id: string;
  operation: "upsert" | "delete";
  base_version: number;
  client_updated_at: string;
  payload?: Record<string, unknown>;
};

export const syncService = {
  health() { return moduleHealth("sync"); },

  async push(batchId: string, changes: IncomingChange[]) {
    const userId = requireUserId();
    const results = [];

    for (const change of changes) {
      const result = await sequelize.transaction(async (transaction) => {
        const prior = await SyncChange.findOne({ where: { user_id: userId, operation_id: change.operation_id }, transaction });
        if (prior) return { operation_id: change.operation_id, status: "accepted", version: Number(prior.get("version")), duplicate: true };

        const record = await SyncRecord.findOne({
          where: { user_id: userId, entity: change.entity, record_id: change.record_id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const currentVersion = record ? Number(record.get("version")) : 0;
        if (change.base_version !== currentVersion) {
          return {
            operation_id: change.operation_id,
            status: "conflict",
            server: record ? { version: currentVersion, payload: record.get("payload"), deleted_at: record.get("deleted_at") } : null,
          };
        }

        const version = currentVersion + 1;
        const changedAt = new Date();
        const previousPayload = record?.get("payload");
        const mergedPayload = change.operation === "delete"
          ? null
          : {
              ...(previousPayload && typeof previousPayload === "object" ? previousPayload as Record<string, unknown> : {}),
              ...(change.payload ?? {}),
            };
        const values = {
          user_id: userId,
          entity: change.entity,
          record_id: change.record_id,
          version,
          payload: mergedPayload,
          deleted_at: change.operation === "delete" ? changedAt : null,
          client_updated_at: new Date(change.client_updated_at),
        };
        if (record) await record.update(values, { transaction });
        else await SyncRecord.create(values, { transaction });
        await SyncChange.create({
          user_id: userId,
          batch_id: batchId,
          operation_id: change.operation_id,
          entity: change.entity,
          record_id: change.record_id,
          operation: change.operation,
          version,
          payload: values.payload,
          changed_at: changedAt,
        }, { transaction });
        return { operation_id: change.operation_id, status: "accepted", version };
      });
      results.push(result);
    }
    return { batch_id: batchId, results };
  },

  async pull(cursor: number, limit: number) {
    const rows = await SyncChange.findAll({
      where: { user_id: requireUserId(), sequence: { [Op.gt]: cursor } },
      order: [["sequence", "ASC"]],
      limit,
    });
    const changes = rows.map((row) => ({
      cursor: Number(row.get("sequence")),
      operation_id: row.get("operation_id"),
      entity: row.get("entity"),
      record_id: row.get("record_id"),
      operation: row.get("operation"),
      version: row.get("version"),
      payload: row.get("payload"),
      changed_at: row.get("changed_at"),
    }));
    return { changes, next_cursor: changes.at(-1)?.cursor ?? cursor, has_more: changes.length === limit };
  },
};
