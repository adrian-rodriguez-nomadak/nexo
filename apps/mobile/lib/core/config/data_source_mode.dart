import 'package:flutter_riverpod/flutter_riverpod.dart';

enum DataSourceMode {
  mock,
  api,
  apiWithMockFallback,
  local,
  localWithApiFallback,
}

const currentDataSourceMode = DataSourceMode.local;

final dataSourceModeProvider = Provider<DataSourceMode>(
  (ref) => currentDataSourceMode,
);
