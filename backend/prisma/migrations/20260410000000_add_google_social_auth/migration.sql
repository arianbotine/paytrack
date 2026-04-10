-- Migration: add_google_social_auth
-- Descrição: Suporte a login social via Google (better-auth)
--
-- Mudanças:
--   1. users.password passa a ser nullable (usuários OAuth não têm senha local)
--   2. Criação das tabelas ba_* usadas exclusivamente pelo better-auth

-- ----------------------------------------------------------------------------
-- 1. Tornar password nullable na tabela existente de usuários
-- ----------------------------------------------------------------------------
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Tabelas do better-auth (prefixo ba_ para não conflitar com as existentes)
-- ----------------------------------------------------------------------------

CREATE TABLE "ba_user" (
    "id"             TEXT        NOT NULL,
    "name"           TEXT        NOT NULL,
    "email"          TEXT        NOT NULL,
    "email_verified" BOOLEAN     NOT NULL,
    "image"          TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ba_user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ba_user_email_key" ON "ba_user"("email");

-- ----------------------------------------------------------------------------

CREATE TABLE "ba_session" (
    "id"         TEXT         NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token"      TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id"    TEXT         NOT NULL,

    CONSTRAINT "ba_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ba_session_token_key" ON "ba_session"("token");

ALTER TABLE "ba_session"
    ADD CONSTRAINT "ba_session_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "ba_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------

CREATE TABLE "ba_account" (
    "id"                       TEXT         NOT NULL,
    "account_id"               TEXT         NOT NULL,
    "provider_id"              TEXT         NOT NULL,
    "user_id"                  TEXT         NOT NULL,
    "access_token"             TEXT,
    "refresh_token"            TEXT,
    "id_token"                 TEXT,
    "access_token_expires_at"  TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope"                    TEXT,
    "password"                 TEXT,
    "created_at"               TIMESTAMP(3) NOT NULL,
    "updated_at"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ba_account_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ba_account"
    ADD CONSTRAINT "ba_account_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "ba_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------

CREATE TABLE "ba_verification" (
    "id"         TEXT         NOT NULL,
    "identifier" TEXT         NOT NULL,
    "value"      TEXT         NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ba_verification_pkey" PRIMARY KEY ("id")
);
