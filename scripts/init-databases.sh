#!/bin/bash
# Creates all HeyTaxi microservice databases automatically on first run
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE user_db;
    CREATE DATABASE driver_db;
    CREATE DATABASE ride_db;
    CREATE DATABASE fare_db;
    CREATE DATABASE payment_db;
    GRANT ALL PRIVILEGES ON DATABASE auth_db TO heytaxi;
    GRANT ALL PRIVILEGES ON DATABASE user_db TO heytaxi;
    GRANT ALL PRIVILEGES ON DATABASE driver_db TO heytaxi;
    GRANT ALL PRIVILEGES ON DATABASE ride_db TO heytaxi;
    GRANT ALL PRIVILEGES ON DATABASE fare_db TO heytaxi;
    GRANT ALL PRIVILEGES ON DATABASE payment_db TO heytaxi;
EOSQL
echo "All HeyTaxi databases created successfully!"
