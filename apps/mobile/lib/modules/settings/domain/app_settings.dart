import 'package:flutter/material.dart';

class AppSettings {
  const AppSettings({
    this.reminders = true,
    this.upcomingPayments = true,
    this.dailySummary = true,
    this.nightSummary = false,
    this.smartInbox = true,
    this.confirmBeforeSave = true,
    this.automaticSummaries = false,
    this.budgetPeriod = 'Quincenal',
    this.currency = 'MXN',
    this.themeMode = ThemeMode.light,
  });

  final bool reminders;
  final bool upcomingPayments;
  final bool dailySummary;
  final bool nightSummary;
  final bool smartInbox;
  final bool confirmBeforeSave;
  final bool automaticSummaries;
  final String budgetPeriod;
  final String currency;
  final ThemeMode themeMode;

  AppSettings copyWith({
    bool? reminders,
    bool? upcomingPayments,
    bool? dailySummary,
    bool? nightSummary,
    bool? smartInbox,
    bool? confirmBeforeSave,
    bool? automaticSummaries,
    String? budgetPeriod,
    String? currency,
    ThemeMode? themeMode,
  }) => AppSettings(
    reminders: reminders ?? this.reminders,
    upcomingPayments: upcomingPayments ?? this.upcomingPayments,
    dailySummary: dailySummary ?? this.dailySummary,
    nightSummary: nightSummary ?? this.nightSummary,
    smartInbox: smartInbox ?? this.smartInbox,
    confirmBeforeSave: confirmBeforeSave ?? this.confirmBeforeSave,
    automaticSummaries: automaticSummaries ?? this.automaticSummaries,
    budgetPeriod: budgetPeriod ?? this.budgetPeriod,
    currency: currency ?? this.currency,
    themeMode: themeMode ?? this.themeMode,
  );

  Map<String, Object> toJson() => {
    'reminders': reminders,
    'upcomingPayments': upcomingPayments,
    'dailySummary': dailySummary,
    'nightSummary': nightSummary,
    'smartInbox': smartInbox,
    'confirmBeforeSave': confirmBeforeSave,
    'automaticSummaries': automaticSummaries,
    'budgetPeriod': budgetPeriod,
    'currency': currency,
    'themeMode': themeMode.name,
  };

  factory AppSettings.fromJson(Map<String, dynamic> json) => AppSettings(
    reminders: json['reminders'] as bool? ?? true,
    upcomingPayments: json['upcomingPayments'] as bool? ?? true,
    dailySummary: json['dailySummary'] as bool? ?? true,
    nightSummary: json['nightSummary'] as bool? ?? false,
    smartInbox: json['smartInbox'] as bool? ?? true,
    confirmBeforeSave: json['confirmBeforeSave'] as bool? ?? true,
    automaticSummaries: json['automaticSummaries'] as bool? ?? false,
    budgetPeriod: json['budgetPeriod'] as String? ?? 'Quincenal',
    currency: json['currency'] as String? ?? 'MXN',
    themeMode: ThemeMode.values.firstWhere(
      (mode) => mode.name == json['themeMode'],
      orElse: () => ThemeMode.light,
    ),
  );
}
