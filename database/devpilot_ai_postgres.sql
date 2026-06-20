-- PostgreSQL Dump
-- Converted from MySQL schema

CREATE TABLE password_resets (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token varchar(500) NOT NULL,
  expires_at timestamp NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamp NOT NULL,
  PRIMARY KEY (id)
);

CREATE TYPE enum_roles_name AS ENUM ('admin','project_manager','developer','tester','viewer');

CREATE TABLE roles (
  id serial NOT NULL,
  name enum_roles_name NOT NULL,
  description varchar(255) DEFAULT NULL,
  permissions json DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE (name)
);

INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'admin', 'Full access to all project resources', '[]'),
(2, 'project_manager', 'Can manage sprints, tasks, and team', '[]'),
(3, 'developer', 'Can write code, complete tasks', '[]'),
(4, 'tester', 'Can review code, run tests, report bugs', '[]'),
(5, 'viewer', 'Read-only access to project', '[]');

-- Reset sequence to accommodate seeded IDs
SELECT setval('roles_id_seq', 5, true);

CREATE TABLE sessions (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  refresh_token text NOT NULL,
  device_info varchar(500) DEFAULT NULL,
  ip_address varchar(50) DEFAULT NULL,
  expires_at timestamp NOT NULL,
  is_revoked boolean DEFAULT false,
  created_at timestamp NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE teams (
  id uuid NOT NULL,
  name varchar(100) NOT NULL,
  description text DEFAULT NULL,
  owner_id uuid NOT NULL,
  avatar varchar(500) DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  PRIMARY KEY (id)
);

CREATE TYPE enum_team_members_role AS ENUM ('owner','admin','member');
CREATE TYPE enum_team_members_status AS ENUM ('active','invited','suspended');

CREATE TABLE team_members (
  id uuid NOT NULL,
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role enum_team_members_role DEFAULT 'member',
  status enum_team_members_status DEFAULT 'active',
  joined_at timestamp NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE users (
  id uuid NOT NULL,
  name varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash varchar(255) DEFAULT NULL,
  avatar text DEFAULT NULL,
  google_id varchar(255) DEFAULT NULL,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  two_fa_secret varchar(255) DEFAULT NULL,
  two_fa_enabled boolean DEFAULT false,
  verification_token varchar(255) DEFAULT NULL,
  last_login timestamp DEFAULT NULL,
  bio text DEFAULT NULL,
  github_username varchar(100) DEFAULT NULL,
  timezone varchar(50) DEFAULT 'UTC',
  preferences json DEFAULT NULL,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  github_pat text DEFAULT NULL,
  github_data json DEFAULT NULL,
  jira_url varchar(255) DEFAULT NULL,
  jira_email varchar(255) DEFAULT NULL,
  jira_token text DEFAULT NULL,
  jira_data json DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE (email),
  UNIQUE (google_id)
);

CREATE TABLE user_roles (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  project_id varchar(255) NOT NULL,
  role_id int NOT NULL,
  assigned_at timestamp NOT NULL,
  PRIMARY KEY (id)
);
