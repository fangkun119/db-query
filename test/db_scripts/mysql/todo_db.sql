-- ============================================================================
-- Todo Management Database - Complete Test Database
-- Version: 1.0
-- Usage: mysql -u root -p < todo_db.sql
-- ============================================================================

-- Drop existing database and user
DROP DATABASE IF EXISTS todo_db;
DROP USER IF EXISTS 'todo_db'@'localhost';

-- Create database and user
CREATE DATABASE todo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'todo_db'@'localhost' IDENTIFIED BY 'todo_tb';
GRANT ALL PRIVILEGES ON todo_db.* TO 'todo_db'@'localhost';
FLUSH PRIVILEGES;

USE todo_db;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Note: In MySQL, ENUM types are defined inline with column definitions
-- within each CREATE TABLE statement (see tasks table below)

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_org_slug (slug),
    INDEX idx_org_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='组织表：存储公司或团队组织的基本信息，包括名称、描述、网站等';

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member',
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    is_active TINYINT(1) DEFAULT 1,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_user_email (email),
    INDEX idx_user_username (username),
    INDEX idx_user_org (organization_id),
    INDEX idx_user_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='用户表：存储系统用户的基本信息，包括用户名、邮箱、角色、时区等';

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    `key` VARCHAR(20) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    is_archived TINYINT(1) DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_project_key (organization_id, `key`),
    INDEX idx_project_org (organization_id),
    INDEX idx_project_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='项目表：存储项目的基本信息，包括项目名称、项目键、描述、颜色标识等';

-- Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_member (project_id, user_id),
    INDEX idx_project_member_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='项目成员表：管理项目与用户的关联关系，定义用户在项目中的角色';

-- Sprints Table
CREATE TABLE IF NOT EXISTS sprints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    status ENUM('planned', 'active', 'completed', 'cancelled') DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_sprint_project (project_id),
    INDEX idx_sprint_status (status),
    INDEX idx_sprint_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='迭代表：存储敏捷开发的迭代（Sprint）信息，包括迭代名称、目标、起止日期等';

-- Labels Table
CREATE TABLE IF NOT EXISTS labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_label_name (project_id, name),
    INDEX idx_label_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='标签表：存储任务标签信息，用于分类和标记任务';

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    sprint_id INT,
    parent_task_id INT,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled', 'archived') DEFAULT 'backlog',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    task_type ENUM('task', 'bug', 'story', 'epic', 'subtask') DEFAULT 'task',
    assignee_id INT,
    reporter_id INT,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    due_date DATE,
    start_date DATE,
    completed_at TIMESTAMP NULL,
    position_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_task_project (project_id),
    INDEX idx_task_sprint (sprint_id),
    INDEX idx_task_status (status),
    INDEX idx_task_priority (priority),
    INDEX idx_task_assignee (assignee_id),
    INDEX idx_task_due_date (due_date),
    INDEX idx_task_parent (parent_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='任务表：存储待办事项任务的核心信息，包括标题、描述、状态、优先级、负责人等';

-- Task Labels Junction Table
CREATE TABLE IF NOT EXISTS task_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    label_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_label (task_id, label_id),
    INDEX idx_task_label_task (task_id),
    INDEX idx_task_label_label (label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='任务标签关联表：实现任务与标签的多对多关联关系';

-- Task Comments Table
CREATE TABLE IF NOT EXISTS task_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id INT,
    is_internal TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
    INDEX idx_comment_task (task_id),
    INDEX idx_comment_user (user_id),
    INDEX idx_comment_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='任务评论表：存储任务的评论和回复，支持嵌套评论结构';

-- Task History Table
CREATE TABLE IF NOT EXISTS task_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type ENUM('created', 'updated', 'deleted', 'commented', 'assigned') DEFAULT 'updated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_history_task (task_id),
    INDEX idx_history_user (user_id),
    INDEX idx_history_created (created_at),
    INDEX idx_history_field (field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='任务历史表：记录任务的所有变更历史，用于审计和追溯';

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT,
    filename VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_attachment_task (task_id),
    INDEX idx_attachment_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='附件表：存储任务相关的文件附件信息';

-- Checklists Table
CREATE TABLE IF NOT EXISTS checklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    position_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_checklist_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='检查清单表：存储任务的检查清单（checklist）容器信息';

-- Checklist Items Table
CREATE TABLE IF NOT EXISTS checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT NOT NULL,
    content VARCHAR(500) NOT NULL,
    is_completed TINYINT(1) DEFAULT 0,
    position_order INT DEFAULT 0,
    completed_by INT,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_checklist_item_checklist (checklist_id),
    INDEX idx_checklist_item_completed (is_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='检查清单项表：存储检查清单中的具体条目及其完成状态';

-- Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    description TEXT,
    duration_minutes INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_time_entry_task (task_id),
    INDEX idx_time_entry_user (user_id),
    INDEX idx_time_entry_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='工时记录表：记录用户在任务上花费的时间，用于时间跟踪和统计';

-- Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    reminder_time TIMESTAMP NOT NULL,
    is_sent TINYINT(1) DEFAULT 0,
    sent_at TIMESTAMP NULL,
    method ENUM('email', 'push', 'sms') DEFAULT 'push',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reminder_task (task_id),
    INDEX idx_reminder_user (user_id),
    INDEX idx_reminder_time (reminder_time),
    INDEX idx_reminder_sent (is_sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='提醒表：存储任务的定时提醒信息，支持邮件、推送、短信等方式';

-- Task Dependencies Table
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    depends_on_task_id INT NOT NULL,
    dependency_type ENUM('blocked_by', 'related_to', 'duplicates', 'is_duplicate_of') DEFAULT 'blocked_by',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (task_id, depends_on_task_id, dependency_type),
    INDEX idx_dependency_task (task_id),
    INDEX idx_dependency_depends (depends_on_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='任务依赖表：定义任务之间的依赖关系，如阻塞、关联、重复等';

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('task_assigned', 'task_commented', 'task_mentioned', 'task_completed', 'sprint_started', 'sprint_ended') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    related_task_id INT,
    is_read TINYINT(1) DEFAULT 0,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_notification_user (user_id),
    INDEX idx_notification_read (is_read),
    INDEX idx_notification_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='通知表：存储系统通知消息，包括任务分配、评论提及、状态变更等';

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    project_id INT,
    task_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_project (project_id),
    INDEX idx_activity_created (created_at),
    INDEX idx_activity_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='活动日志表：记录用户在系统中的所有操作活动，用于审计和分析';

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Organizations (5 organizations)
INSERT INTO organizations (id, name, slug, description, website, is_active) VALUES
(1, 'TechCorp Inc.', 'techcorp', 'Technology solutions provider', 'https://techcorp.com', 1),
(2, 'StartupXYZ', 'startupxyz', 'Innovative startup building next-gen products', 'https://startupxyz.io', 1),
(3, 'DesignStudio', 'designstudio', 'Creative design agency', 'https://designstudio.co', 1),
(4, 'DevTeam LLC', 'devteam', 'Software development consultancy', 'https://devteam.io', 1),
(5, 'OpenSource Community', 'opensource', 'Open source software community', 'https://opensource.org', 1);

-- Users (50 users)
INSERT INTO users (id, organization_id, username, email, display_name, role, timezone, is_active) VALUES
-- TechCorp users (15)
(1, 1, 'john.doe', 'john.doe@techcorp.com', 'John Doe', 'owner', 'America/New_York', 1),
(2, 1, 'jane.smith', 'jane.smith@techcorp.com', 'Jane Smith', 'admin', 'America/Los_Angeles', 1),
(3, 1, 'mike.johnson', 'mike.johnson@techcorp.com', 'Mike Johnson', 'member', 'Europe/London', 1),
(4, 1, 'sarah.williams', 'sarah.williams@techcorp.com', 'Sarah Williams', 'member', 'America/Chicago', 1),
(5, 1, 'david.brown', 'david.brown@techcorp.com', 'David Brown', 'member', 'Asia/Tokyo', 1),
(6, 1, 'emily.davis', 'emily.davis@techcorp.com', 'Emily Davis', 'member', 'Australia/Sydney', 1),
(7, 1, 'chris.miller', 'chris.miller@techcorp.com', 'Chris Miller', 'member', 'America/New_York', 1),
(8, 1, 'lisa.wilson', 'lisa.wilson@techcorp.com', 'Lisa Wilson', 'member', 'Europe/Paris', 1),
(9, 1, 'robert.moore', 'robert.moore@techcorp.com', 'Robert Moore', 'admin', 'America/Denver', 1),
(10, 1, 'amanda.taylor', 'amanda.taylor@techcorp.com', 'Amanda Taylor', 'member', 'Asia/Shanghai', 1),
(11, 1, 'kevin.anderson', 'kevin.anderson@techcorp.com', 'Kevin Anderson', 'member', 'Europe/Berlin', 1),
(12, 1, 'jennifer.thomas', 'jennifer.thomas@techcorp.com', 'Jennifer Thomas', 'member', 'America/Toronto', 1),
(13, 1, 'thomas.jackson', 'thomas.jackson@techcorp.com', 'Thomas Jackson', 'guest', 'Pacific/Auckland', 1),
(14, 1, 'michelle.white', 'michelle.white@techcorp.com', 'Michelle White', 'member', 'America/Phoenix', 1),
(15, 1, 'james.harris', 'james.harris@techcorp.com', 'James Harris', 'member', 'Asia/Seoul', 1),
-- StartupXYZ users (12)
(16, 2, 'alex.martin', 'alex.martin@startupxyz.io', 'Alex Martin', 'owner', 'America/Los_Angeles', 1),
(17, 2, 'beth.thompson', 'beth.thompson@startupxyz.io', 'Beth Thompson', 'admin', 'America/New_York', 1),
(18, 2, 'carol.garcia', 'carol.garcia@startupxyz.io', 'Carol Garcia', 'member', 'Europe/London', 1),
(19, 2, 'daniel.martinez', 'daniel.martinez@startupxyz.io', 'Daniel Martinez', 'member', 'America/Chicago', 1),
(20, 2, 'emma.robinson', 'emma.robinson@startupxyz.io', 'Emma Robinson', 'member', 'Asia/Tokyo', 1),
(21, 2, 'frank.clark', 'frank.clark@startupxyz.io', 'Frank Clark', 'member', 'Australia/Sydney', 1),
(22, 2, 'grace.rodriguez', 'grace.rodriguez@startupxyz.io', 'Grace Rodriguez', 'member', 'America/Boston', 1),
(23, 2, 'henry.lewis', 'henry.lewis@startupxyz.io', 'Henry Lewis', 'member', 'Europe/Amsterdam', 1),
(24, 2, 'ivy.lee', 'ivy.lee@startupxyz.io', 'Ivy Lee', 'member', 'Pacific/Honolulu', 1),
(25, 2, 'jack.walker', 'jack.walker@startupxyz.io', 'Jack Walker', 'guest', 'America/Denver', 1),
(26, 2, 'karen.hall', 'karen.hall@startupxyz.io', 'Karen Hall', 'member', 'Asia/Singapore', 1),
(27, 2, 'liam.allen', 'liam.allen@startupxyz.io', 'Liam Allen', 'member', 'Europe/Rome', 1),
-- DesignStudio users (10)
(28, 3, 'maya.young', 'maya.young@designstudio.co', 'Maya Young', 'owner', 'America/Los_Angeles', 1),
(29, 3, 'noah.king', 'noah.king@designstudio.co', 'Noah King', 'admin', 'America/New_York', 1),
(30, 3, 'olivia.wright', 'olivia.wright@designstudio.co', 'Olivia Wright', 'member', 'Europe/London', 1),
(31, 3, 'paul.scott', 'paul.scott@designstudio.co', 'Paul Scott', 'member', 'America/Chicago', 1),
(32, 3, 'quinn.torres', 'quinn.torres@designstudio.co', 'Quinn Torres', 'member', 'Asia/Tokyo', 1),
(33, 3, 'rachel.nguyen', 'rachel.nguyen@designstudio.co', 'Rachel Nguyen', 'member', 'Australia/Sydney', 1),
(34, 3, 'samuel.hill', 'samuel.hill@designstudio.co', 'Samuel Hill', 'member', 'America/Seattle', 1),
(35, 3, 'tina.flores', 'tina.flores@designstudio.co', 'Tina Flores', 'member', 'Europe/Paris', 1),
(36, 3, 'ivan.green', 'ivan.green@designstudio.co', 'Ivan Green', 'guest', 'Asia/Dubai', 1),
(37, 3, 'julia.adams', 'julia.adams@designstudio.co', 'Julia Adams', 'member', 'America/Miami', 1),
-- DevTeam LLC users (8)
(38, 4, 'kevin.nelson', 'kevin.nelson@devteam.io', 'Kevin Nelson', 'owner', 'America/New_York', 1),
(39, 4, 'laura.mitchell', 'laura.mitchell@devteam.io', 'Laura Mitchell', 'admin', 'America/Los_Angeles', 1),
(40, 4, 'mark.phillips', 'mark.phillips@devteam.io', 'Mark Phillips', 'member', 'Europe/London', 1),
(41, 4, 'nancy.campbell', 'nancy.campbell@devteam.io', 'Nancy Campbell', 'member', 'America/Chicago', 1),
(42, 4, 'oscar.roberts', 'oscar.roberts@devteam.io', 'Oscar Roberts', 'member', 'Asia/Tokyo', 1),
(43, 4, 'penny.carter', 'penny.carter@devteam.io', 'Penny Carter', 'member', 'Australia/Sydney', 1),
(44, 4, 'quincy.collins', 'quincy.collins@devteam.io', 'Quincy Collins', 'member', 'Europe/Berlin', 1),
(45, 4, 'rachel.edwards', 'rachel.edwards@devteam.io', 'Rachel Edwards', 'member', 'America/Dallas', 1),
-- OpenSource Community users (5)
(46, 5, 'ryan.stewart', 'ryan.stewart@opensource.org', 'Ryan Stewart', 'owner', 'America/New_York', 1),
(47, 5, 'sandra.morris', 'sandra.morris@opensource.org', 'Sandra Morris', 'admin', 'Europe/London', 1),
(48, 5, 'terry.reed', 'terry.reed@opensource.org', 'Terry Reed', 'member', 'America/Los_Angeles', 1),
(49, 5, 'ursula.cook', 'ursula.cook@opensource.org', 'Ursula Cook', 'member', 'Asia/Tokyo', 1),
(50, 5, 'victor.bailey', 'victor.bailey@opensource.org', 'Victor Bailey', 'member', 'Australia/Sydney', 1);

-- Projects (20 projects)
INSERT INTO projects (id, organization_id, name, `key`, description, color, icon, created_by) VALUES
(1, 1, 'Website Redesign', 'WEB', 'Complete overhaul of company website', '#3B82F6', 'globe', 1),
(2, 1, 'Mobile App', 'APP', 'Native mobile application development', '#10B981', 'smartphone', 2),
(3, 1, 'API Platform', 'API', 'RESTful API platform for integrations', '#F59E0B', 'server', 3),
(4, 1, 'Database Migration', 'DB', 'Legacy database migration project', '#EF4444', 'database', 4),
(5, 1, 'Security Audit', 'SEC', 'Comprehensive security assessment', '#8B5CF6', 'shield', 5),
(6, 2, 'MVP Launch', 'MVP', 'Minimum viable product for Q1 launch', '#EC4899', 'rocket', 16),
(7, 2, 'User Analytics', 'ANA', 'Analytics dashboard and reporting', '#06B6D4', 'chart-bar', 17),
(8, 2, 'Payment Integration', 'PAY', 'Payment gateway integration', '#84CC16', 'credit-card', 18),
(9, 2, 'Email Service', 'EMA', 'Transactional email system', '#F97316', 'envelope', 19),
(10, 3, 'Brand Identity', 'BRD', 'Corporate branding and identity', '#6366F1', 'palette', 28),
(11, 3, 'Marketing Website', 'MKT', 'Marketing landing pages', '#14B8A6', 'layout', 29),
(12, 3, 'Product Design', 'PRD', 'Product UI/UX design system', '#A855F7', 'pen-tool', 30),
(13, 3, 'Social Media', 'SOC', 'Social media campaign assets', '#F43F5E', 'share', 31),
(14, 4, 'Client Portal', 'CPT', 'Customer self-service portal', '#0EA5E9', 'users', 38),
(15, 4, 'Internal Tools', 'INT', 'Internal admin and management tools', '#22C55E', 'wrench', 39),
(16, 4, 'Performance Optimization', 'PERF', 'System performance improvements', '#EAB308', 'zap', 40),
(17, 4, 'Documentation', 'DOC', 'Technical documentation project', '#64748B', 'book', 41),
(18, 5, 'Community Platform', 'COM', 'Open source community platform', '#7C3AED', 'users', 46),
(19, 5, 'Contributor Tools', 'CON', 'Tools for open source contributors', '#BE185D', 'git-pull', 47),
(20, 5, 'Documentation Site', 'DWS', 'Public documentation website', '#059669', 'globe', 48);

-- Project Members (assign users to projects)
INSERT INTO project_members (project_id, user_id, role)
SELECT
    p.id,
    u.id,
    CASE
        WHEN u.id = p.created_by THEN 'owner'
        WHEN u.role IN ('owner', 'admin') THEN 'admin'
        ELSE 'member'
    END
FROM projects p
CROSS JOIN users u
WHERE u.organization_id = p.organization_id
AND RAND() > 0.3;

-- Sprints (80 sprints)
INSERT INTO sprints (project_id, name, goal, status, start_date, end_date, order_index)
SELECT
    p.id,
    CONCAT('Sprint ', FLOOR((s.num - 1) / 4) + 1),
    CONCAT('Iteration ', FLOOR((s.num - 1) / 4) + 1, ' for ', p.name),
    CASE
        WHEN FLOOR((s.num - 1) / 4) = 0 THEN 'completed'
        WHEN FLOOR((s.num - 1) / 4) = 1 THEN 'completed'
        WHEN FLOOR((s.num - 1) / 4) = 2 THEN 'active'
        ELSE 'planned'
    END,
    DATE_ADD('2024-01-01', INTERVAL (FLOOR((s.num - 1) / 4) * 14) DAY),
    DATE_ADD('2024-01-14', INTERVAL (FLOOR((s.num - 1) / 4) * 14) DAY),
    s.num
FROM projects p
CROSS JOIN (SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) s
ORDER BY p.id, s.num;

-- Labels (60 labels)
INSERT INTO labels (project_id, name, color, description)
SELECT
    p.id,
    l.name,
    l.color,
    l.description
FROM projects p
CROSS JOIN (
    SELECT 'bug' AS name, '#EF4444' AS color, 'Bug or defect' AS description
    UNION SELECT 'enhancement', '#3B82F6', 'Feature enhancement'
    UNION SELECT 'documentation', '#F59E0B', 'Documentation needed'
    UNION SELECT 'urgent', '#DC2626', 'Urgent attention required'
    UNION SELECT 'feature', '#10B981', 'New feature request'
    UNION SELECT 'question', '#8B5CF6', 'Needs clarification'
) l
WHERE RAND() > 0.2;

-- Tasks (2000+ tasks with various statuses)
INSERT INTO tasks (project_id, sprint_id, title, description, status, priority, task_type, assignee_id, reporter_id, estimated_hours, due_date, position_order)
SELECT
    t.project_id,
    t.sprint_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.task_type,
    t.assignee_id,
    t.reporter_id,
    t.estimated_hours,
    t.due_date,
    t.position_order
FROM (
    SELECT
        p.id AS project_id,
        (SELECT id FROM sprints WHERE project_id = p.id ORDER BY RAND() LIMIT 1) AS sprint_id,
        CONCAT(
            CASE t.task_type
                WHEN 'bug' THEN 'Fix: '
                WHEN 'story' THEN 'Story: '
                WHEN 'epic' THEN 'Epic: '
                ELSE 'Task: '
            END,
            CASE t.priority
                WHEN 'critical' THEN 'Critical - '
                WHEN 'high' THEN 'High - '
                WHEN 'low' THEN 'Low - '
                ELSE ''
            END,
            ' ',
            SUBSTRING(MD5(RAND()), 1, 8),
            ' - ',
            CASE t.task_type
                WHEN 'bug' THEN 'Bug found in production'
                WHEN 'story' THEN 'User story implementation'
                WHEN 'epic' THEN 'Epic feature work'
                ELSE 'Development task'
            END
        ) AS title,
        CONCAT('Detailed description for task: ', SUBSTRING(MD5(RAND()), 1, 20)) AS description,
        t.status AS status,
        t.priority AS priority,
        t.task_type AS task_type,
        (SELECT id FROM users WHERE organization_id = p.organization_id ORDER BY RAND() LIMIT 1) AS assignee_id,
        (SELECT id FROM users WHERE organization_id = p.organization_id ORDER BY RAND() LIMIT 1) AS reporter_id,
        ROUND(RAND() * 16 + 1, 2) AS estimated_hours,
        DATE_ADD(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY) AS due_date,
        @rownum := @rownum + 1 AS position_order
    FROM projects p
    CROSS JOIN (
        SELECT 'bug' AS task_type, 'critical' AS priority, 'in_progress' AS status
        UNION SELECT 'bug', 'high', 'todo'
        UNION SELECT 'bug', 'medium', 'backlog'
        UNION SELECT 'story', 'high', 'in_review'
        UNION SELECT 'story', 'medium', 'done'
        UNION SELECT 'story', 'low', 'archived'
        UNION SELECT 'task', 'medium', 'todo'
        UNION SELECT 'task', 'high', 'in_progress'
        UNION SELECT 'task', 'low', 'backlog'
        UNION SELECT 'epic', 'critical', 'backlog'
    ) t
    CROSS JOIN (SELECT @rownum := 0) r
    WHERE RAND() > 0.1
    LIMIT 2000
) t;

-- Additional 500 high-priority tasks
INSERT INTO tasks (project_id, sprint_id, title, description, status, priority, task_type, assignee_id, reporter_id, estimated_hours, due_date, position_order)
SELECT
    p.id AS project_id,
    (SELECT id FROM sprints WHERE project_id = p.id AND status = 'active' LIMIT 1) AS sprint_id,
    CONCAT('Hotfix: ', SUBSTRING(MD5(RAND()), 1, 10), ' - Critical issue') AS title,
    'Critical production issue requiring immediate attention' AS description,
    'in_progress' AS status,
    'critical' AS priority,
    'bug' AS task_type,
    (SELECT id FROM users WHERE organization_id = p.organization_id ORDER BY RAND() LIMIT 1) AS assignee_id,
    (SELECT id FROM users WHERE organization_id = p.organization_id AND role = 'owner' LIMIT 1) AS reporter_id,
    ROUND(RAND() * 8 + 2, 2) AS estimated_hours,
    DATE_ADD(CURDATE(), INTERVAL FLOOR(RAND() * 7) DAY) AS due_date,
    (SELECT MAX(position_order) + 1 FROM tasks WHERE project_id = p.id) AS position_order
FROM projects p
CROSS JOIN (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) nums
WHERE RAND() > 0.3;

-- Task Labels (assign labels to tasks)
INSERT INTO task_labels (task_id, label_id)
SELECT
    t.id,
    l.id
FROM tasks t
CROSS JOIN labels l
WHERE t.project_id = l.project_id
AND RAND() > 0.7
LIMIT 3000;

-- Task Comments (1500+ comments)
INSERT INTO task_comments (task_id, user_id, content, parent_comment_id, is_internal)
SELECT
    t.id AS task_id,
    (SELECT id FROM users WHERE organization_id = (SELECT organization_id FROM projects WHERE id = t.project_id) ORDER BY RAND() LIMIT 1) AS user_id,
    CONCAT('Comment: ', SUBSTRING(MD5(RAND()), 1, 30), ' - This is feedback on the task') AS content,
    NULL AS parent_comment_id,
    FLOOR(RAND() * 2) AS is_internal
FROM tasks t
WHERE RAND() > 0.3
LIMIT 1500;

-- Replies to comments (500 replies)
INSERT INTO task_comments (task_id, user_id, content, parent_comment_id, is_internal)
SELECT
    c.task_id,
    (SELECT id FROM users WHERE id != c.user_id LIMIT 1) AS user_id,
    CONCAT('Reply: ', SUBSTRING(MD5(RAND()), 1, 20)) AS content,
    c.id AS parent_comment_id,
    0 AS is_internal
FROM task_comments c
WHERE c.parent_comment_id IS NULL
AND RAND() > 0.6
LIMIT 500;

-- Task History (5000+ history entries)
INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type)
SELECT
    t.id AS task_id,
    (SELECT id FROM users WHERE organization_id = (SELECT organization_id FROM projects WHERE id = t.project_id) ORDER BY RAND() LIMIT 1) AS user_id,
    h.field_name,
    h.old_value,
    h.new_value,
    h.change_type
FROM tasks t
CROSS JOIN (
    SELECT 'status' AS field_name, 'backlog' AS old_value, 'todo' AS new_value, 'updated' AS change_type
    UNION SELECT 'status', 'todo', 'in_progress', 'updated'
    UNION SELECT 'status', 'in_progress', 'in_review', 'updated'
    UNION SELECT 'status', 'in_review', 'done', 'updated'
    UNION SELECT 'priority', 'low', 'high', 'updated'
    UNION SELECT 'priority', 'medium', 'critical', 'updated'
    UNION SELECT 'assignee_id', NULL, '1', 'assigned'
) h
WHERE RAND() > 0.5
LIMIT 5000;

-- Attachments (800+ attachments)
INSERT INTO attachments (task_id, user_id, filename, file_url, file_size, mime_type)
SELECT
    t.id AS task_id,
    (SELECT id FROM users WHERE organization_id = (SELECT organization_id FROM projects WHERE id = t.project_id) ORDER BY RAND() LIMIT 1) AS user_id,
    CONCAT('attachment_', SUBSTRING(MD5(RAND()), 1, 10), '.pdf') AS filename,
    CONCAT('https://storage.example.com/files/', SUBSTRING(MD5(RAND()), 1, 20), '.pdf') AS file_url,
    FLOOR(RAND() * 10000000 + 100000) AS file_size,
    'application/pdf' AS mime_type
FROM tasks t
WHERE RAND() > 0.6
LIMIT 800;

-- Checklists (400 checklists)
INSERT INTO checklists (task_id, title, position_order)
SELECT
    t.id AS task_id,
    CONCAT('Checklist: ', SUBSTRING(MD5(RAND()), 1, 15)) AS title,
    FLOOR(RAND() * 5) AS position_order
FROM tasks t
WHERE t.task_type IN ('task', 'story') AND RAND() > 0.8
LIMIT 400;

-- Checklist Items (2000+ items)
INSERT INTO checklist_items (checklist_id, content, is_completed, position_order, completed_at)
SELECT
    c.id AS checklist_id,
    CONCAT('Item ', n.num, ': ', SUBSTRING(MD5(RAND()), 1, 20)) AS content,
    FLOOR(RAND() * 2) AS is_completed,
    n.num AS position_order,
    CASE WHEN FLOOR(RAND() * 2) = 1 THEN DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 7) DAY) ELSE NULL END AS completed_at
FROM checklists c
CROSS JOIN (SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) n
WHERE RAND() > 0.3
LIMIT 2000;

-- Time Entries (3000+ time entries)
INSERT INTO time_entries (task_id, user_id, description, duration_minutes, date)
SELECT
    t.id AS task_id,
    t.assignee_id AS user_id,
    CONCAT('Work on task: ', SUBSTRING(t.title, 1, 50)) AS description,
    FLOOR(RAND() * 240 + 30) AS duration_minutes,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY) AS date
FROM tasks t
WHERE t.assignee_id IS NOT NULL AND t.status != 'backlog'
AND RAND() > 0.4
LIMIT 3000;

-- Reminders (600+ reminders)
INSERT INTO reminders (task_id, user_id, reminder_time, method)
SELECT
    t.id AS task_id,
    t.assignee_id AS user_id,
    DATE_ADD(t.due_date, INTERVAL -FLOOR(RAND() * 24) HOUR) AS reminder_time,
    (SELECT val FROM (SELECT 'email' AS val UNION SELECT 'push' UNION SELECT 'sms') AS tmp ORDER BY RAND() LIMIT 1) AS method
FROM tasks t
WHERE t.assignee_id IS NOT NULL AND t.due_date IS NOT NULL AND t.due_date > CURDATE()
AND RAND() > 0.7
LIMIT 600;

-- Task Dependencies (400+ dependencies)
INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
SELECT
    t1.id AS task_id,
    t2.id AS depends_on_task_id,
    (SELECT val FROM (SELECT 'blocked_by' AS val UNION SELECT 'related_to') AS tmp ORDER BY RAND() LIMIT 1) AS dependency_type
FROM tasks t1
CROSS JOIN tasks t2
WHERE t1.project_id = t2.project_id
AND t1.id != t2.id
AND t1.id < t2.id
AND RAND() > 0.95
LIMIT 400;

-- Notifications (2500+ notifications)
INSERT INTO notifications (user_id, type, title, content, related_task_id, is_read, read_at)
SELECT
    u.id AS user_id,
    (SELECT val FROM (SELECT 'task_assigned' AS val UNION SELECT 'task_commented' UNION SELECT 'task_mentioned' UNION SELECT 'task_completed') AS tmp ORDER BY RAND() LIMIT 1) AS type,
    CONCAT('Notification: ', SUBSTRING(MD5(RAND()), 1, 15)) AS title,
    CONCAT('You have a new notification regarding task activity') AS content,
    (SELECT id FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE organization_id = u.organization_id) ORDER BY RAND() LIMIT 1) AS related_task_id,
    FLOOR(RAND() * 2) AS is_read,
    CASE WHEN FLOOR(RAND() * 2) = 1 THEN DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 7) DAY) ELSE NULL END AS read_at
FROM users u
CROSS JOIN (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) n
WHERE RAND() > 0.2
LIMIT 2500;

-- Activity Logs (4000+ activity logs)
INSERT INTO activity_logs (user_id, project_id, task_id, action, entity_type, entity_id, ip_address)
SELECT
    (SELECT id FROM users ORDER BY RAND() LIMIT 1) AS user_id,
    p.id AS project_id,
    (SELECT id FROM tasks WHERE project_id = p.id ORDER BY RAND() LIMIT 1) AS task_id,
    a.action AS action,
    a.entity_type AS entity_type,
    a.entity_id AS entity_id,
    CONCAT(FLOOR(RAND() * 255), '.', FLOOR(RAND() * 255), '.', FLOOR(RAND() * 255), '.', FLOOR(RAND() * 255)) AS ip_address
FROM projects p
CROSS JOIN (
    SELECT 'task.created' AS action, 'task' AS entity_type, FLOOR(RAND() * 1000) AS entity_id
    UNION SELECT 'task.updated', 'task', FLOOR(RAND() * 1000)
    UNION SELECT 'task.completed', 'task', FLOOR(RAND() * 1000)
    UNION SELECT 'comment.added', 'comment', FLOOR(RAND() * 1000)
    UNION SELECT 'user.login', 'user', FLOOR(RAND() * 100)
) a
WHERE RAND() > 0.3
LIMIT 4000;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Database created successfully!' AS message;
SELECT
    'Organizations' AS Table_Name, COUNT(*) AS Row_Count FROM organizations
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Projects', COUNT(*) FROM projects
UNION ALL SELECT 'Project_Members', COUNT(*) FROM project_members
UNION ALL SELECT 'Sprints', COUNT(*) FROM sprints
UNION ALL SELECT 'Labels', COUNT(*) FROM labels
UNION ALL SELECT 'Tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'Task_Labels', COUNT(*) FROM task_labels
UNION ALL SELECT 'Task_Comments', COUNT(*) FROM task_comments
UNION ALL SELECT 'Task_History', COUNT(*) FROM task_history
UNION ALL SELECT 'Attachments', COUNT(*) FROM attachments
UNION ALL SELECT 'Checklists', COUNT(*) FROM checklists
UNION ALL SELECT 'Checklist_Items', COUNT(*) FROM checklist_items
UNION ALL SELECT 'Time_Entries', COUNT(*) FROM time_entries
UNION ALL SELECT 'Reminders', COUNT(*) FROM reminders
UNION ALL SELECT 'Task_Dependencies', COUNT(*) FROM task_dependencies
UNION ALL SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'Activity_Logs', COUNT(*) FROM activity_logs;

SELECT 'Connection: mysql://todo_db:todo_tb@localhost:3306/todo_db' AS Connection_Info;
