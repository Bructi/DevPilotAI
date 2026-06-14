-- DevPilot AI - MySQL Database Setup
-- Run this in phpMyAdmin (XAMPP) or MySQL CLI

CREATE DATABASE IF NOT EXISTS devpilot_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE devpilot_ai;

-- The tables below are auto-created by Sequelize sync({ alter: true })
-- when the server starts. This file is for manual reference only.

-- users table (auto-created by Sequelize)
-- roles table (auto-created by Sequelize)
-- user_roles table (auto-created by Sequelize)
-- teams table (auto-created by Sequelize)
-- team_members table (auto-created by Sequelize)
-- sessions table (auto-created by Sequelize)
-- password_resets table (auto-created by Sequelize)

-- Insert default roles (run after first server start creates the tables)
-- INSERT IGNORE INTO roles (name, description) VALUES
--   ('admin', 'Full administrative access'),
--   ('project_manager', 'Manage projects and teams'),
--   ('developer', 'Create and complete tasks'),
--   ('tester', 'Run tests and report bugs'),
--   ('viewer', 'View-only access');

SELECT 'Database devpilot_ai ready!' AS status;
