import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class NotificationService {
  NotificationService(this.plugin);

  final FlutterLocalNotificationsPlugin plugin;
  bool _initialized = false;

  static const details = NotificationDetails(
    android: AndroidNotificationDetails(
      'nexo_reminders',
      'Recordatorios de Nexo',
      channelDescription: 'Tareas, pagos y resúmenes personales',
      importance: Importance.high,
      priority: Priority.high,
    ),
    iOS: DarwinNotificationDetails(),
  );

  Future<void> initialize() async {
    if (_initialized) return;
    tz.initializeTimeZones();
    try {
      final zone = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(zone.identifier));
    } catch (_) {
      tz.setLocalLocation(tz.UTC);
    }
    await plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
    );
    _initialized = true;
  }

  Future<bool> requestPermission() async {
    await initialize();
    if (Platform.isAndroid) {
      return await plugin
              .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin
              >()
              ?.requestNotificationsPermission() ??
          false;
    }
    return await plugin
            .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin
            >()
            ?.requestPermissions(alert: true, badge: true, sound: true) ??
        false;
  }

  Future<void> schedule({
    required int id,
    required String title,
    required String body,
    required DateTime date,
  }) async {
    await initialize();
    if (!date.isAfter(DateTime.now())) return;
    await plugin.zonedSchedule(
      id: id,
      title: title,
      body: body,
      scheduledDate: tz.TZDateTime.from(date, tz.local),
      notificationDetails: details,
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
    );
  }

  Future<void> scheduleDailySummary({
    required bool morning,
    required bool enabled,
  }) async {
    await initialize();
    final id = morning ? 900001 : 900002;
    await plugin.cancel(id: id);
    if (!enabled) return;
    final now = tz.TZDateTime.now(tz.local);
    final hour = morning ? 8 : 21;
    var date = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour);
    if (!date.isAfter(now)) date = date.add(const Duration(days: 1));
    await plugin.zonedSchedule(
      id: id,
      title: morning ? 'Tu día en Nexo' : 'Cierre del día',
      body: morning
          ? 'Revisa tareas, eventos y pagos próximos.'
          : 'Consulta tus pendientes y movimientos de hoy.',
      scheduledDate: date,
      notificationDetails: details,
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }
}
