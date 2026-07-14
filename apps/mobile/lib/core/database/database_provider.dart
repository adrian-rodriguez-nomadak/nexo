import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_database.dart';
import 'local_seed_service.dart';

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final database = AppDatabase();
  ref.onDispose(database.close);
  return database;
});

final localSeedServiceProvider = Provider<LocalSeedService>((ref) {
  return LocalSeedService(ref.watch(appDatabaseProvider));
});
