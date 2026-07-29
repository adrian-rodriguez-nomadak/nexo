class NexoUser {
  const NexoUser({
    required this.id,
    required this.email,
    required this.displayName,
  });

  factory NexoUser.fromJson(Map<String, dynamic> json) {
    return NexoUser(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? 'Usuario',
    );
  }

  final String id;
  final String email;
  final String displayName;

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'displayName': displayName,
  };
}

class NexoSession {
  const NexoSession({
    required this.token,
    required this.expiresAt,
    required this.user,
  });

  factory NexoSession.fromJson(Map<String, dynamic> json) {
    return NexoSession(
      token: json['token']?.toString() ?? '',
      expiresAt: DateTime.parse(json['expiresAt'].toString()),
      user: NexoUser.fromJson(json['user'] as Map<String, dynamic>),
    );
  }

  final String token;
  final DateTime expiresAt;
  final NexoUser user;

  bool get isLocallyValid =>
      token.isNotEmpty && expiresAt.isAfter(DateTime.now());
}
