module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DB_URL || 'postgres://gpsmlujgegusbd:28c756082890555c6f16f9353742620b1d978985df1441b43674e363ea756d1a@ec2-184-72-236-57.compute-1.amazonaws.com:5432/df01ig6jgdofv7',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://dunder-mifflin@localhost/spaced-repetition-test',
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '3h',
}
