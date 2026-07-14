import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/inbox_tables.dart';

part 'inbox_dao.g.dart';

@DriftAccessor(tables: [InboxActions])
class InboxDao extends DatabaseAccessor<AppDatabase> with _$InboxDaoMixin {
  InboxDao(super.db);

  Future<List<InboxAction>> getActions() {
    return (select(
      inboxActions,
    )..orderBy([(table) => OrderingTerm.desc(table.createdAt)])).get();
  }

  Future<void> insertAction(InboxActionsCompanion action) {
    return into(inboxActions).insertOnConflictUpdate(action);
  }
}
