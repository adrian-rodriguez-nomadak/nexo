import 'package:shared_preferences/shared_preferences.dart';

import '../domain/observer_settings.dart';

class ObserverPreferences {
  static const _legacyPermissionPrefix = 'observer.permission.';
  static const _scopePrefix = 'observer.scope.';
  static const _playSoundKey = 'observer.playSound';
  static const _speakSavedItemsKey = 'observer.speakSavedItems';
  static const _confirmBeforeSavingKey = 'observer.confirmBeforeSaving';

  Future<ObserverStoredPreferences> load(Iterable<ObserverScope> scopes) async {
    final preferences = await SharedPreferences.getInstance();
    return ObserverStoredPreferences(
      enabledScopeIds: {
        for (final scope in scopes)
          if (preferences.getBool('$_scopePrefix${scope.id}') ??
              preferences.getBool(
                '$_legacyPermissionPrefix${scope.module.id}',
              ) ??
              false)
            scope.id,
      },
      playSound: preferences.getBool(_playSoundKey) ?? true,
      speakSavedItems: preferences.getBool(_speakSavedItemsKey) ?? true,
      confirmBeforeSaving: preferences.getBool(_confirmBeforeSavingKey) ?? true,
    );
  }

  Future<void> saveModule(
    ObserverModulePermission permission,
    bool enabled,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    await Future.wait([
      preferences.setBool(
        '$_legacyPermissionPrefix${permission.module.id}',
        enabled,
      ),
      for (final scope in permission.scopes)
        preferences.setBool('$_scopePrefix${scope.id}', enabled),
    ]);
  }

  Future<void> saveScope(ObserverScope scope, bool enabled) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool('$_scopePrefix${scope.id}', enabled);
  }

  Future<void> saveNotificationSettings({
    required bool playSound,
    required bool speakSavedItems,
    required bool confirmBeforeSaving,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    await Future.wait([
      preferences.setBool(_playSoundKey, playSound),
      preferences.setBool(_speakSavedItemsKey, speakSavedItems),
      preferences.setBool(_confirmBeforeSavingKey, confirmBeforeSaving),
    ]);
  }
}

class ObserverStoredPreferences {
  const ObserverStoredPreferences({
    required this.enabledScopeIds,
    required this.playSound,
    required this.speakSavedItems,
    required this.confirmBeforeSaving,
  });

  final Set<String> enabledScopeIds;
  final bool playSound;
  final bool speakSavedItems;
  final bool confirmBeforeSaving;
}
