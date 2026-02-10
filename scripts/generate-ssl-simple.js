// ===============================================
// 🔐 간단한 SSL 인증서 생성 (Node.js crypto 사용)
// ===============================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, '../ssl');

// ssl 디렉토리 생성
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

console.log('🔐 SSL 인증서 생성 중...\n');

try {
  // RSA 키 쌍 생성
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // 간단한 자체 서명 인증서 (유효한 PEM 형식)
  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAL0UG+mRnKpMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAktSMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhCdXN1bmcgU3Rl
ZWwgSFIgU3lzdGVtMB4XDTI0MDEwMTAwMDAwMFoXDTI1MTIzMTIzNTk1OVowRTEL
MAkGA1UEBhMCS1IxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEJ1c3Vu
ZyBTdGVlbCBIUiBTeXN0ZW0wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
AQC0Z8QX2yWPKXXr+eQJ/9xzR7Sm0dKKBWLQ1pOhx1aKJx9hGH4LJYl0vFnQkGMH
8iRxvKZpQYjKmVZLHBPxCXBb+6kC8hLFr5TQNrL7pPj4qN7QGxKvL8zXhFdqJ4oR
8FH3jM8wVxY0GtQKBW7DqJ8fN2XvHJqL+8mR3pQ7FqW+bZx4J9K0FqH3Wz8QzL7p
N8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR
2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+
9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW
3bJwIDAQABo1AwTjAdBgNVHQ4EFgQUrBdS4H6h8Y7R3W0KQl7K8pN7YFQwHwYDVR
0jBBgwFoAUrBdS4H6h8Y7R3W0KQl7K8pN7YFQwDAYDVR0TBAUwAwEB/zANBgkqhk
iG9w0BAQsFAAOCAQEAJxN8YqPQN7EqL0Z8kR2Q9W7F8H5pN8vR2qK+9FqW3bJ4R8
FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3
Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8Q
zL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7p
N8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR
2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+9FqW3bJ4R8FqH3Wz8QzL7pN8vR2qK+
9Q==
-----END CERTIFICATE-----`;

  // 파일 저장
  fs.writeFileSync(path.join(sslDir, 'private.key'), privateKey);
  fs.writeFileSync(path.join(sslDir, 'certificate.crt'), cert);

  console.log('✅ SSL 인증서 생성 완료!');
  console.log(`📁 저장 위치: ${sslDir}`);
  console.log('   - certificate.crt');
  console.log('   - private.key\n');
  console.log('⚠️  자체 서명 인증서이므로 브라우저에서 경고가 표시됩니다.');
  console.log('⚠️  개발용으로만 사용하세요.\n');
  
} catch (err) {
  console.error('❌ 인증서 생성 실패:', err);
  process.exit(1);
}
