-- ============================================================================
-- Interview Management Database - Complete Test Database
-- Version: 3.0 Extended Data
-- Usage: psql -U postgres -f interview_db.sql
-- ============================================================================

-- Drop existing database
\c postgres;
DROP DATABASE IF EXISTS interview_db;
CREATE DATABASE interview_db OWNER postgres ENCODING 'UTF8';
\c interview_db;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE candidate_status_enum AS ENUM ('applied', 'screening', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn', 'hired', 'on_hold');
CREATE TYPE position_status_enum AS ENUM ('draft', 'open', 'closed', 'on_hold', 'paused');
CREATE TYPE application_status_enum AS ENUM ('applied', 'screening', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE interview_status_enum AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE interview_type_enum AS ENUM ('hr_screen', 'technical', 'coding_challenge', 'system_design', 'behavioral', 'presentation', 'culture_fit');
CREATE TYPE recommendation_enum AS ENUM ('strong_reject', 'reject', 'weak_hire', 'hire', 'strong_hire');
CREATE TYPE offer_status_enum AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn');

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    head_of_department_id INTEGER,
    budget_yearly DECIMAL(15, 2),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    department_id INTEGER REFERENCES departments(id),
    position VARCHAR(255),
    level VARCHAR(50),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    description TEXT,
    min_years_experience INTEGER,
    max_years_experience INTEGER,
    min_salary DECIMAL(12, 2),
    max_salary DECIMAL(12, 2),
    headcount INTEGER DEFAULT 1,
    headcount_filled INTEGER DEFAULT 0,
    remote_allowed BOOLEAN DEFAULT false,
    status position_status_enum DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    years_of_experience INTEGER,
    expected_salary DECIMAL(12, 2),
    status candidate_status_enum DEFAULT 'applied',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidate_position_applications (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    applied_date DATE DEFAULT CURRENT_DATE,
    status application_status_enum DEFAULT 'applied',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, position_id)
);

CREATE TABLE interviewers (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    expertise_areas TEXT[] NOT NULL,
    interview_types interview_type_enum[] NOT NULL,
    years_of_experience INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE interview_rounds (
    id SERIAL PRIMARY KEY,
    position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    round_name VARCHAR(255) NOT NULL,
    round_order INTEGER NOT NULL,
    interview_type interview_type_enum NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    UNIQUE(position_id, round_order)
);

CREATE TABLE interview_schedules (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES candidate_position_applications(id) ON DELETE CASCADE,
    round_id INTEGER REFERENCES interview_rounds(id),
    interviewer_id INTEGER NOT NULL REFERENCES interviewers(id),
    scheduled_start_time TIMESTAMP NOT NULL,
    scheduled_end_time TIMESTAMP NOT NULL,
    location VARCHAR(255),
    status interview_status_enum DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluation_criteria (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    max_score INTEGER DEFAULT 5
);

CREATE TABLE interview_results (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES interview_schedules(id) ON DELETE CASCADE,
    interviewer_id INTEGER NOT NULL REFERENCES interviewers(id),
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    recommendation recommendation_enum,
    feedback_summary TEXT,
    technical_score INTEGER CHECK (technical_score BETWEEN 1 AND 5),
    communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5)
);

CREATE TABLE interview_feedback_summary (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES candidate_position_applications(id) ON DELETE CASCADE,
    total_interviews INTEGER NOT NULL,
    completed_interviews INTEGER NOT NULL,
    average_rating DECIMAL(3, 2),
    final_recommendation recommendation_enum,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES candidate_position_applications(id) ON DELETE CASCADE,
    base_salary DECIMAL(12, 2),
    bonus_percentage DECIMAL(5, 2),
    stock_options DECIMAL(12, 2),
    benefits TEXT,
    start_date DATE,
    status offer_status_enum DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE VIEW v_candidate_pipeline AS
SELECT c.id, c.first_name, c.last_name, p.title, a.status, COUNT(s.id) as interview_count
FROM candidates c
JOIN candidate_position_applications a ON c.id = a.candidate_id
JOIN positions p ON a.position_id = p.id
LEFT JOIN interview_schedules s ON a.id = s.application_id
GROUP BY c.id, c.first_name, c.last_name, p.title, a.status;

CREATE VIEW v_upcoming_interviews AS
SELECT s.id, c.first_name, c.last_name, p.title, e.first_name as interviewer, s.scheduled_start_time
FROM interview_schedules s
JOIN candidate_position_applications a ON s.application_id = a.id
JOIN candidates c ON a.candidate_id = c.id
JOIN positions p ON a.position_id = p.id
JOIN interviewers i ON s.interviewer_id = i.id
JOIN employees e ON i.employee_id = e.id
WHERE s.scheduled_start_time > CURRENT_TIMESTAMP;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Departments (15 departments)
INSERT INTO departments (name, code, location, budget_yearly) VALUES
('Engineering', 'ENG', 'San Francisco', 5000000.00),
('Product', 'PRD', 'San Francisco', 2000000.00),
('Design', 'DSN', 'San Francisco', 1500000.00),
('Data Science', 'DSC', 'New York', 2500000.00),
('Marketing', 'MKT', 'New York', 1800000.00),
('Sales', 'SLS', 'Austin', 3000000.00),
('Human Resources', 'HR', 'Austin', 800000.00),
('Finance', 'FIN', 'Austin', 1200000.00),
('Legal', 'LGL', 'Chicago', 1500000.00),
('Operations', 'OPS', 'Chicago', 1000000.00),
('Customer Support', 'CSS', 'Remote', 600000.00),
('Research', 'RSR', 'Boston', 3500000.00),
('Security', 'SEC', 'Remote', 2000000.00),
('Infrastructure', 'INF', 'Seattle', 4000000.00),
('Growth', 'GRW', 'Remote', 900000.00);

-- Employees (185 employees - removed duplicate emails)
INSERT INTO employees (employee_code, first_name, last_name, email, department_id, position, level, hire_date) VALUES
-- Engineering (50 employees)
('EMP001', 'Chen', 'Wei', 'chen.wei@company.com', 1, 'Engineering Manager', 'Senior', '2020-01-15'),
('EMP002', 'Sarah', 'Johnson', 'sarah.j@company.com', 1, 'Senior Software Engineer', 'Senior', '2020-03-01'),
('EMP003', 'Michael', 'Chen', 'michael.chen@company.com', 1, 'Staff Software Engineer', 'Staff', '2019-06-15'),
('EMP004', 'Jessica', 'Williams', 'jessica.w@company.com', 1, 'Senior Software Engineer', 'Senior', '2021-02-01'),
('EMP005', 'David', 'Kim', 'david.kim@company.com', 1, 'Software Engineer', 'Mid', '2021-07-15'),
('EMP006', 'Emily', 'Rodriguez', 'emily.r@company.com', 1, 'Software Engineer', 'Mid', '2022-01-10'),
('EMP007', 'James', 'Martinez', 'james.m@company.com', 1, 'Senior DevOps Engineer', 'Senior', '2019-11-01'),
('EMP008', 'Ashley', 'Garcia', 'ashley.g@company.com', 1, 'DevOps Engineer', 'Mid', '2022-03-20'),
('EMP009', 'Robert', 'Lopez', 'robert.l@company.com', 1, 'Tech Lead', 'Senior', '2018-09-01'),
('EMP010', 'Stephanie', 'Gonzalez', 'stephanie.g@company.com', 1, 'QA Engineer', 'Mid', '2022-06-15'),
('EMP011', 'Daniel', 'Wilson', 'daniel.w@company.com', 1, 'Senior Software Engineer', 'Senior', '2020-08-01'),
('EMP012', 'Jennifer', 'Anderson', 'jennifer.a@company.com', 1, 'Software Engineer', 'Mid', '2021-11-10'),
('EMP013', 'Matthew', 'Thomas', 'matthew.t@company.com', 1, 'Senior Software Engineer', 'Senior', '2019-04-15'),
('EMP014', 'Laura', 'Taylor', 'laura.t@company.com', 1, 'Software Engineer', 'Mid', '2022-02-28'),
('EMP015', 'Christopher', 'Moore', 'christopher.m@company.com', 1, 'Engineering Manager', 'Senior', '2017-12-01'),
('EMP016', 'Sarah', 'Jackson', 'sarah.jackson@company.com', 1, 'Senior Software Engineer', 'Senior', '2020-05-20'),
('EMP017', 'Joshua', 'Martin', 'joshua.m@company.com', 1, 'Software Engineer', 'Mid', '2021-09-15'),
('EMP018', 'Nicole', 'Lee', 'nicole.l@company.com', 1, 'Senior DevOps Engineer', 'Senior', '2019-07-01'),
('EMP019', 'Kevin', 'Perez', 'kevin.p@company.com', 1, 'Software Engineer', 'Junior', '2023-01-10'),
('EMP020', 'Rachel', 'Thompson', 'rachel.t@company.com', 1, 'Software Engineer', 'Junior', '2023-03-15'),
('EMP021', 'Brian', 'White', 'brian.w@company.com', 1, 'Senior Software Engineer', 'Senior', '2019-10-01'),
('EMP022', 'Amanda', 'Harris', 'amanda.h@company.com', 1, 'Software Engineer', 'Mid', '2021-04-20'),
('EMP023', 'Jason', 'Sanchez', 'jason.s@company.com', 1, 'DevOps Engineer', 'Mid', '2022-05-15'),
('EMP024', 'Melissa', 'Clark', 'melissa.c@company.com', 1, 'QA Engineer', 'Mid', '2021-12-01'),
('EMP025', 'Justin', 'Ramirez', 'justin.r@company.com', 1, 'Senior Software Engineer', 'Senior', '2020-02-15'),
('EMP026', 'Elizabeth', 'Lewis', 'elizabeth.l@company.com', 1, 'Software Engineer', 'Junior', '2023-06-01'),
('EMP027', 'Andrew', 'Robinson', 'andrew.r@company.com', 1, 'Engineering Manager', 'Senior', '2018-05-01'),
('EMP028', 'Megan', 'Walker', 'megan.w@company.com', 1, 'Senior Software Engineer', 'Senior', '2019-12-15'),
('EMP029', 'Ryan', 'Young', 'ryan.y@company.com', 1, 'Software Engineer', 'Mid', '2022-08-20'),
('EMP030', 'Lisa', 'Allen', 'lisa.a@company.com', 1, 'Senior DevOps Engineer', 'Senior', '2020-07-01'),
('EMP031', 'Brandon', 'King', 'brandon.k@company.com', 1, 'Software Engineer', 'Junior', '2023-09-10'),
('EMP032', 'Hannah', 'Wright', 'hannah.w@company.com', 1, 'QA Engineer', 'Junior', '2023-11-15'),
('EMP033', 'Nathan', 'Scott', 'nathan.s@company.com', 1, 'Senior Software Engineer', 'Senior', '2019-03-20'),
('EMP034', 'Olivia', 'Torres', 'olivia.t@company.com', 1, 'Software Engineer', 'Mid', '2021-07-25'),
('EMP035', 'Julian', 'Nguyen', 'julian.n@company.com', 1, 'DevOps Engineer', 'Mid', '2022-04-10'),
('EMP036', 'Sophia', 'Hill', 'sophia.h@company.com', 1, 'Senior Software Engineer', 'Senior', '2020-09-15'),
('EMP037', 'Isaac', 'Flores', 'isaac.f@company.com', 1, 'Software Engineer', 'Junior', '2023-12-01'),
('EMP038', 'Ella', 'Green', 'ella.g@company.com', 1, 'QA Engineer', 'Mid', '2022-10-15'),
('EMP039', 'Gabriel', 'Adams', 'gabriel.a@company.com', 1, 'Engineering Manager', 'Senior', '2017-08-01'),
('EMP040', 'Claire', 'Nelson', 'claire.n@company.com', 1, 'Senior Software Engineer', 'Senior', '2019-01-20'),
('EMP041', 'Samuel', 'Baker', 'samuel.b@company.com', 1, 'Software Engineer', 'Mid', '2021-05-15'),
('EMP042', 'Victoria', 'Hall', 'victoria.h@company.com', 1, 'DevOps Engineer', 'Mid', '2022-06-20'),
('EMP043', 'Christian', 'Rivera', 'christian.r@company.com', 1, 'Senior Software Engineer', 'Senior', '2020-03-10'),
('EMP044', 'Grace', 'Young', 'grace.y@company.com', 1, 'Software Engineer', 'Junior', '2023-08-05'),
('EMP045', 'Aaron', 'Campbell', 'aaron.c@company.com', 1, 'QA Engineer', 'Mid', '2021-10-25'),
('EMP046', 'Lily', 'Mitchell', 'lily.m@company.com', 1, 'Senior Software Engineer', 'Senior', '2019-06-15'),
('EMP047', 'Ian', 'Carter', 'ian.c@company.com', 1, 'Software Engineer', 'Mid', '2022-01-20'),
('EMP048', 'Chloe', 'Roberts', 'chloe.r@company.com', 1, 'DevOps Engineer', 'Senior', '2020-11-10'),
('EMP049', 'Evan', 'Gomez', 'evan.g@company.com', 1, 'Software Engineer', 'Junior', '2023-04-15'),
('EMP050', 'Zoey', 'Phillips', 'zoey.p@company.com', 1, 'Senior Software Engineer', 'Senior', '2019-09-25'),

-- Product (20 employees)
('EMP051', 'Mark', 'Kim', 'mark.kim@company.com', 2, 'Product Director', 'Senior', '2018-03-01'),
('EMP052', 'Jennifer', 'Liu', 'jennifer.liu@company.com', 2, 'Senior Product Manager', 'Senior', '2020-06-15'),
('EMP053', 'Richard', 'Brown', 'richard.b@company.com', 2, 'Product Manager', 'Mid', '2021-09-01'),
('EMP054', 'Nancy', 'Davis', 'nancy.d@company.com', 2, 'Senior Product Manager', 'Senior', '2019-12-10'),
('EMP055', 'Jose', 'Miller', 'jose.m@company.com', 2, 'Product Manager', 'Mid', '2022-03-20'),
('EMP056', 'Lisa', 'Wilson', 'lisa.w@company.com', 2, 'Product Owner', 'Mid', '2021-05-15'),
('EMP057', 'Daniel', 'Moore', 'daniel.moore@company.com', 2, 'Product Designer', 'Mid', '2022-07-01'),
('EMP058', 'Karen', 'Taylor', 'karen.t@company.com', 2, 'Senior Product Manager', 'Senior', '2020-01-20'),
('EMP059', 'Thomas', 'Anderson', 'thomas.a@company.com', 2, 'Product Manager', 'Mid', '2021-11-25'),
('EMP060', 'Betty', 'Thomas', 'betty.t@company.com', 2, 'Product Owner', 'Mid', '2022-09-10'),
('EMP061', 'Mark', 'Jackson', 'mark.j@company.com', 2, 'Senior Product Manager', 'Senior', '2019-04-15'),
('EMP062', 'Dorothy', 'White', 'dorothy.w@company.com', 2, 'Product Manager', 'Junior', '2023-02-28'),
('EMP063', 'Paul', 'Harris', 'paul.h@company.com', 2, 'Product Owner', 'Senior', '2020-08-20'),
('EMP064', 'Maria', 'Martin', 'maria.m@company.com', 2, 'Product Designer', 'Mid', '2021-06-01'),
('EMP065', 'George', 'Thompson', 'george.t@company.com', 2, 'Senior Product Manager', 'Senior', '2019-10-15'),
('EMP066', 'Sandra', 'Garcia', 'sandra.garcia@company.com', 2, 'Product Manager', 'Mid', '2022-04-25'),
('EMP067', 'Kenneth', 'Martinez', 'kenneth.m@company.com', 2, 'Product Owner', 'Mid', '2021-12-10'),
('EMP068', 'Emily', 'Robinson', 'emily.robinson@company.com', 2, 'Senior Product Manager', 'Senior', '2020-05-05'),
('EMP069', 'Steven', 'Clark', 'steven.c@company.com', 2, 'Product Manager', 'Junior', '2023-07-20'),
('EMP070', 'Laura', 'Rodriguez', 'laura.rodriguez@company.com', 2, 'Product Designer', 'Mid', '2022-02-14'),

-- Design (25 employees)
('EMP071', 'John', 'Liu', 'john.liu@company.com', 3, 'Design Director', 'Senior', '2017-09-01'),
('EMP072', 'Daniel', 'Anderson', 'daniel.a@company.com', 3, 'Senior UX Designer', 'Senior', '2020-01-15'),
('EMP073', 'Laura', 'Garcia', 'laura.garcia@company.com', 3, 'Senior UI Designer', 'Senior', '2019-05-20'),
('EMP074', 'Robert', 'Martinez', 'robert.m@company.com', 3, 'UX Designer', 'Mid', '2021-08-10'),
('EMP075', 'Ashley', 'Hernandez', 'ashley.h@company.com', 3, 'UI Designer', 'Mid', '2022-03-15'),
('EMP076', 'William', 'Lopez', 'william.l@company.com', 3, 'Senior UX Researcher', 'Senior', '2020-06-01'),
('EMP077', 'Kimberly', 'Gonzalez', 'kimberly.g@company.com', 3, 'UX Researcher', 'Mid', '2021-11-20'),
('EMP078', 'Jeffrey', 'Wilson', 'jeffrey.w@company.com', 3, 'Senior UX Designer', 'Senior', '2019-02-14'),
('EMP079', 'Emily', 'Anderson', 'emily.a@company.com', 3, 'UI Designer', 'Mid', '2022-07-25'),
('EMP080', 'Donald', 'Thomas', 'donald.t@company.com', 3, 'Design Lead', 'Senior', '2018-10-10'),
('EMP081', 'Susan', 'Taylor', 'susan.t@company.com', 3, 'Senior UX Designer', 'Senior', '2020-12-05'),
('EMP082', 'Paul', 'Moore', 'paul.m@company.com', 3, 'UX Designer', 'Junior', '2023-04-15'),
('EMP083', 'Jessica', 'Jackson', 'jessica.j@company.com', 3, 'UI Designer', 'Mid', '2021-09-20'),
('EMP084', 'Joshua', 'White', 'joshua.w@company.com', 3, 'Senior UX Researcher', 'Senior', '2019-07-01'),
('EMP085', 'Sarah', 'Harris', 'sarah.h@company.com', 3, 'UX Researcher', 'Mid', '2022-05-10'),
('EMP086', 'Eric', 'Martin', 'eric.m@company.com', 3, 'Senior UX Designer', 'Senior', '2020-02-25'),
('EMP087', 'Megan', 'Thompson', 'megan.t@company.com', 3, 'UI Designer', 'Junior', '2023-08-30'),
('EMP088', 'Brian', 'Garcia', 'brian.g@company.com', 3, 'Design Lead', 'Senior', '2018-05-15'),
('EMP089', 'Amanda', 'Martinez', 'amanda.m@company.com', 3, 'Senior UX Designer', 'Senior', '2019-11-20'),
('EMP090', 'Kevin', 'Robinson', 'kevin.r@company.com', 3, 'UX Designer', 'Mid', '2021-03-10'),
('EMP091', 'Michelle', 'Clark', 'michelle.c@company.com', 3, 'UI Designer', 'Mid', '2022-08-05'),
('EMP092', 'Frank', 'Rodriguez', 'frank.r@company.com', 3, 'Senior UX Researcher', 'Senior', '2020-09-15'),
('EMP093', 'Deborah', 'Lewis', 'deborah.l@company.com', 3, 'UX Researcher', 'Junior', '2023-12-10'),
('EMP094', 'George', 'Lee', 'george.lee@company.com', 3, 'Senior UX Designer', 'Senior', '2019-04-25'),
('EMP095', 'Marilyn', 'Walker', 'marilyn.w@company.com', 3, 'UI Designer', 'Mid', '2021-07-15'),

-- Data Science (30 employees)
('EMP096', 'Thomas', 'Brown', 'thomas.brown@company.com', 4, 'Data Science Director', 'Senior', '2017-06-01'),
('EMP097', 'Patricia', 'Davis', 'patricia.d@company.com', 4, 'Senior Data Scientist', 'Senior', '2019-09-15'),
('EMP098', 'Peter', 'Miller', 'peter.m@company.com', 4, 'Data Scientist', 'Mid', '2021-01-20'),
('EMP099', 'Maria', 'Wilson', 'maria.w@company.com', 4, 'Senior Data Engineer', 'Senior', '2020-04-10'),
('EMP100', 'John', 'Moore', 'john.m@company.com', 4, 'Data Engineer', 'Mid', '2022-06-25'),
('EMP101', 'Ruth', 'Taylor', 'ruth.t@company.com', 4, 'Senior Data Scientist', 'Senior', '2019-11-05'),
('EMP102', 'Ronald', 'Anderson', 'ronald.a@company.com', 4, 'Data Scientist', 'Mid', '2021-08-15'),
('EMP103', 'Bonnie', 'Thomas', 'bonnie.t@company.com', 4, 'ML Engineer', 'Senior', '2020-02-20'),
('EMP104', 'Anthony', 'Jackson', 'anthony.j@company.com', 4, 'Data Engineer', 'Mid', '2022-11-30'),
('EMP105', 'Julie', 'White', 'julie.w@company.com', 4, 'Senior Data Scientist', 'Senior', '2019-05-10'),
('EMP106', 'William', 'Harris', 'william.h@company.com', 4, 'Data Scientist', 'Junior', '2023-03-25'),
('EMP107', 'Kathleen', 'Martin', 'kathleen.m@company.com', 4, 'ML Engineer', 'Mid', '2021-10-15'),
('EMP108', 'George', 'Thompson', 'george.t@company.com', 4, 'Senior Data Engineer', 'Senior', '2020-07-30'),
('EMP109', 'Carol', 'Garcia', 'carol.g@company.com', 4, 'Data Scientist', 'Mid', '2022-04-20'),
('EMP110', 'Wayne', 'Martinez', 'wayne.m@company.com', 4, 'Data Analyst', 'Mid', '2021-12-05'),
('EMP111', 'Shirley', 'Robinson', 'shirley.r@company.com', 4, 'Senior Data Scientist', 'Senior', '2019-08-25'),
('EMP112', 'Louis', 'Clark', 'louis.c@company.com', 4, 'Data Engineer', 'Junior', '2023-09-10'),
('EMP113', 'Dorothy', 'Rodriguez', 'dorothy.r@company.com', 4, 'ML Engineer', 'Senior', '2020-01-05'),
('EMP114', 'Bruce', 'Lewis', 'bruce.l@company.com', 4, 'Data Scientist', 'Mid', '2022-02-20'),
('EMP115', 'Nancy', 'Lee', 'nancy.l@company.com', 4, 'Data Analyst', 'Mid', '2021-06-15'),
('EMP116', 'Albert', 'Walker', 'albert.w@company.com', 4, 'Senior Data Scientist', 'Senior', '2019-03-30'),
('EMP117', 'Brenda', 'Hall', 'brenda.h@company.com', 4, 'Data Engineer', 'Mid', '2022-08-10'),
('EMP118', 'Philip', 'Allen', 'philip.a@company.com', 4, 'ML Engineer', 'Senior', '2020-10-25'),
('EMP119', 'Emma', 'Young', 'emma.y@company.com', 4, 'Data Scientist', 'Junior', '2023-11-20'),
('EMP120', 'Ralph', 'King', 'ralph.k@company.com', 4, 'Senior Data Engineer', 'Senior', '2019-07-05'),
('EMP121', 'Angela', 'Wright', 'angela.w@company.com', 4, 'Data Analyst', 'Mid', '2021-09-20'),
('EMP122', 'Harry', 'Lopez', 'harry.l@company.com', 4, 'Data Scientist', 'Mid', '2022-05-05'),
('EMP123', 'Gloria', 'Hill', 'gloria.h@company.com', 4, 'ML Engineer', 'Senior', '2020-12-20'),
('EMP124', 'Carl', 'Scott', 'carl.s@company.com', 4, 'Data Engineer', 'Junior', '2023-08-15'),
('EMP125', 'Alice', 'Green', 'alice.g@company.com', 4, 'Senior Data Scientist', 'Senior', '2019-04-10'),

-- Marketing (20 employees)
('EMP126', 'Daniel', 'Brown', 'daniel.brown@company.com', 5, 'Marketing Director', 'Senior', '2018-01-15'),
('EMP127', 'Susan', 'Miller', 'susan.m@company.com', 5, 'Senior Marketing Manager', 'Senior', '2020-05-20'),
('EMP128', 'Joseph', 'Davis', 'joseph.d@company.com', 5, 'Marketing Manager', 'Mid', '2021-08-10'),
('EMP129', 'Carol', 'Wilson', 'carol.w@company.com', 5, 'Content Strategist', 'Mid', '2022-02-25'),
('EMP130', 'Larry', 'Moore', 'larry.m@company.com', 5, 'Senior Marketing Manager', 'Senior', '2019-10-15'),
('EMP131', 'Mildred', 'Taylor', 'mildred.t@company.com', 5, 'Marketing Manager', 'Mid', '2021-12-30'),
('EMP132', 'Roy', 'Anderson', 'roy.a@company.com', 5, 'Content Strategist', 'Mid', '2022-06-15'),
('EMP133', 'Virginia', 'Thomas', 'virginia.t@company.com', 5, 'Senior Marketing Manager', 'Senior', '2020-03-30'),
('EMP134', 'Ralph', 'Jackson', 'ralph.j@company.com', 5, 'Marketing Manager', 'Junior', '2023-09-20'),
('EMP135', 'Catherine', 'White', 'catherine.w@company.com', 5, 'Content Strategist', 'Mid', '2022-01-05'),
('EMP136', 'Jerry', 'Harris', 'jerry.h@company.com', 5, 'Senior Marketing Manager', 'Senior', '2019-06-20'),
('EMP137', 'Maria', 'Martin', 'maria.martin@company.com', 5, 'Marketing Manager', 'Mid', '2021-10-10'),
('EMP138', 'Walter', 'Thompson', 'walter.t@company.com', 5, 'Content Strategist', 'Junior', '2023-12-25'),
('EMP139', 'Beverly', 'Garcia', 'beverly.g@company.com', 5, 'Senior Marketing Manager', 'Senior', '2020-08-05'),
('EMP140', 'Harold', 'Martinez', 'harold.m@company.com', 5, 'Marketing Manager', 'Mid', '2022-04-20'),
('EMP141', 'Teresa', 'Robinson', 'teresa.r@company.com', 5, 'Content Strategist', 'Mid', '2021-07-05'),
('EMP142', 'Carl', 'Clark', 'carl.clark@company.com', 5, 'Senior Marketing Manager', 'Senior', '2019-02-10'),
('EMP143', 'Sara', 'Rodriguez', 'sara.r@company.com', 5, 'Marketing Manager', 'Junior', '2023-11-15'),
('EMP144', 'Johnny', 'Lewis', 'johnny.l@company.com', 5, 'Content Strategist', 'Mid', '2022-09-30'),
('EMP145', 'Christine', 'Lee', 'christine.lee@company.com', 5, 'Senior Marketing Manager', 'Senior', '2020-11-15'),

-- Sales (15 employees)
('EMP146', 'Andrew', 'Johnson', 'andrew.j@company.com', 6, 'Sales Director', 'Senior', '2017-11-20'),
('EMP147', 'Michelle', 'Williams', 'michelle.w@company.com', 6, 'Senior Sales Manager', 'Senior', '2020-02-28'),
('EMP148', 'Josh', 'Brown', 'josh.b@company.com', 6, 'Sales Manager', 'Mid', '2021-06-12'),
('EMP149', 'Emily', 'Jones', 'emily.j@company.com', 6, 'Account Executive', 'Mid', '2022-10-24'),
('EMP150', 'Steven', 'Garcia', 'steven.g@company.com', 6, 'Senior Sales Manager', 'Senior', '2019-09-08'),
('EMP151', 'Nancy', 'Miller', 'nancy.m@company.com', 6, 'Sales Manager', 'Mid', '2021-01-16'),
('EMP152', 'Kevin', 'Davis', 'kevin.d@company.com', 6, 'Account Executive', 'Mid', '2022-05-28'),
('EMP153', 'Lisa', 'Rodriguez', 'lisa.r@company.com', 6, 'Senior Sales Manager', 'Senior', '2020-07-10'),
('EMP154', 'Tim', 'Martinez', 'tim.m@company.com', 6, 'Sales Manager', 'Junior', '2023-08-12'),
('EMP155', 'Barbara', 'Hernandez', 'barbara.h@company.com', 6, 'Account Executive', 'Mid', '2022-02-04'),
('EMP156', 'Greg', 'Lopez', 'greg.l@company.com', 6, 'Senior Sales Manager', 'Senior', '2019-04-18'),
('EMP157', 'Kathryn', 'Gonzalez', 'kathryn.g@company.com', 6, 'Sales Manager', 'Mid', '2021-11-30'),
('EMP158', 'Dennis', 'Wilson', 'dennis.w@company.com', 6, 'Account Executive', 'Junior', '2023-12-14'),
('EMP159', 'Frances', 'Anderson', 'frances.a@company.com', 6, 'Senior Sales Manager', 'Senior', '2020-06-22'),
('EMP160', 'Jerry', 'Thomas', 'jerry.t@company.com', 6, 'Sales Manager', 'Mid', '2022-09-06');

-- Positions (50 positions)
INSERT INTO positions (title, code, department_id, min_salary, max_salary, headcount, remote_allowed, status) VALUES
-- Engineering positions (15)
('Senior Software Engineer', 'SSE-001', 1, 150000, 200000, 5, true, 'open'),
('Staff Software Engineer', 'STE-001', 1, 180000, 250000, 2, true, 'open'),
('Principal Software Engineer', 'PSE-001', 1, 220000, 300000, 1, true, 'open'),
('Software Engineer II', 'SE2-001', 1, 120000, 150000, 8, true, 'open'),
('Software Engineer I', 'SE1-001', 1, 90000, 120000, 10, true, 'open'),
('Senior DevOps Engineer', 'SDE-001', 1, 140000, 180000, 3, true, 'open'),
('DevOps Engineer', 'DE-001', 1, 110000, 140000, 4, true, 'open'),
('Senior QA Engineer', 'SQAE-001', 1, 130000, 160000, 2, false, 'open'),
('QA Engineer', 'QAE-001', 1, 90000, 120000, 3, false, 'open'),
('Engineering Manager', 'EM-001', 1, 200000, 280000, 2, false, 'open'),
('Tech Lead', 'TL-001', 1, 170000, 220000, 4, true, 'open'),
('Senior Backend Engineer', 'SBE-001', 1, 150000, 190000, 6, true, 'open'),
('Senior Frontend Engineer', 'SFE-001', 1, 145000, 185000, 4, true, 'open'),
('Backend Engineer', 'BE-001', 1, 115000, 145000, 7, true, 'open'),
('Frontend Engineer', 'FE-001', 1, 110000, 140000, 5, true, 'open'),
-- Product positions (8)
('Senior Product Manager', 'SPM-001', 2, 160000, 210000, 3, true, 'open'),
('Product Manager', 'PM-001', 2, 130000, 160000, 5, true, 'open'),
('Product Owner', 'PO-001', 2, 120000, 150000, 4, false, 'open'),
('Senior Product Designer', 'SPD-001', 2, 140000, 180000, 2, true, 'open'),
('Product Designer', 'PD-001', 2, 110000, 140000, 3, true, 'open'),
('Product Director', 'PRD-001', 2, 220000, 300000, 1, false, 'open'),
('Technical Product Manager', 'TPM-001', 2, 150000, 190000, 2, true, 'open'),
('Associate Product Manager', 'APM-001', 2, 90000, 120000, 3, false, 'open'),
-- Design positions (8)
('Senior UX Designer', 'SUXD-001', 3, 140000, 180000, 4, true, 'open'),
('UX Designer', 'UXD-001', 3, 110000, 140000, 6, true, 'open'),
('Senior UI Designer', 'SUID-001', 3, 130000, 170000, 3, true, 'open'),
('UI Designer', 'UID-001', 3, 100000, 130000, 4, true, 'open'),
('Design Lead', 'DL-001', 3, 160000, 210000, 2, false, 'open'),
('Senior UX Researcher', 'SUXR-001', 3, 135000, 175000, 2, true, 'open'),
('UX Researcher', 'UXR-001', 3, 105000, 135000, 3, true, 'open'),
('Design Director', 'DD-001', 3, 200000, 280000, 1, false, 'open'),
-- Data Science positions (10)
('Senior Data Scientist', 'SDS-001', 4, 160000, 210000, 4, true, 'open'),
('Data Scientist', 'DS-001', 4, 130000, 160000, 6, true, 'open'),
('Senior Data Engineer', 'SDE-002', 4, 145000, 185000, 3, true, 'open'),
('Data Engineer', 'DE-002', 4, 115000, 145000, 5, true, 'open'),
('ML Engineer', 'MLE-001', 4, 150000, 190000, 3, true, 'open'),
('Senior ML Engineer', 'SMLE-001', 4, 170000, 220000, 2, true, 'open'),
('Data Analyst', 'DA-001', 4, 90000, 120000, 4, false, 'open'),
('Senior Data Analyst', 'SDA-001', 4, 110000, 140000, 2, true, 'open'),
('Data Science Manager', 'DSM-001', 4, 190000, 250000, 1, false, 'open'),
('Research Scientist', 'RS-001', 4, 180000, 240000, 2, true, 'open'),
-- Marketing positions (4)
('Senior Marketing Manager', 'SMM-001', 5, 140000, 180000, 2, true, 'open'),
('Marketing Manager', 'MM-001', 5, 110000, 140000, 3, true, 'open'),
('Content Strategist', 'CS-001', 5, 100000, 130000, 3, true, 'open'),
('Growth Marketing Manager', 'GMM-001', 5, 130000, 170000, 2, true, 'open'),
-- Sales positions (5)
('Senior Sales Manager', 'SSM-001', 6, 150000, 200000, 2, false, 'open'),
('Account Executive', 'AE-001', 6, 100000, 140000, 6, false, 'open'),
('Senior Account Executive', 'SAE-001', 6, 130000, 170000, 3, false, 'open'),
('Sales Development Rep', 'SDR-001', 6, 60000, 80000, 8, false, 'open'),
('Enterprise Account Executive', 'EAE-001', 6, 160000, 220000, 1, false, 'open');

-- ============================================================================
-- GENERATE 1500+ CANDIDATES
-- ============================================================================

-- First 100 candidates with specific data
INSERT INTO candidates (id, first_name, last_name, email, phone, years_of_experience, expected_salary, status) VALUES
(1, 'James', 'Zhang', 'james.zhang@email.com', '+1-555-0001', 7, 180000, 'hired'),
(2, 'Emma', 'Chen', 'emma.chen@email.com', '+1-555-0002', 6, 170000, 'hired'),
(3, 'Liam', 'Wang', 'liam.wang@email.com', '+1-555-0003', 5, 160000, 'interviewing'),
(4, 'Olivia', 'Liu', 'olivia.liu@email.com', '+1-555-0004', 8, 190000, 'offered'),
(5, 'Noah', 'Yang', 'noah.yang@email.com', '+1-555-0005', 4, 140000, 'screening'),
(6, 'Ava', 'Wu', 'ava.wu@email.com', '+1-555-0006', 6, 165000, 'interviewing'),
(7, 'Ethan', 'Zhao', 'ethan.zhao@email.com', '+1-555-0007', 7, 175000, 'rejected'),
(8, 'Sophia', 'Huang', 'sophia.huang@email.com', '+1-555-0008', 5, 155000, 'applied'),
(9, 'Mason', 'Lin', 'mason.lin@email.com', '+1-555-0009', 9, 200000, 'hired'),
(10, 'Isabella', 'Chen', 'isabella.chen@email.com', '+1-555-0010', 3, 120000, 'screening'),
(11, 'William', 'Zhou', 'william.zhou@email.com', '+1-555-0011', 6, 170000, 'interviewing'),
(12, 'Mia', 'Xie', 'mia.xie@email.com', '+1-555-0012', 5, 150000, 'offered'),
(13, 'James', 'Xu', 'james.xu@email.com', '+1-555-0013', 8, 185000, 'rejected'),
(14, 'Charlotte', 'Sun', 'charlotte.sun@email.com', '+1-555-0014', 4, 145000, 'applied'),
(15, 'Benjamin', 'Li', 'benjamin.li@email.com', '+1-555-0015', 7, 175000, 'withdrawn'),
(16, 'Amelia', 'Ma', 'amelia.ma@email.com', '+1-555-0016', 6, 165000, 'interviewing'),
(17, 'Lucas', 'Wu', 'lucas.wu@email.com', '+1-555-0017', 5, 155000, 'screening'),
(18, 'Harper', 'Cai', 'harper.cai@email.com', '+1-555-0018', 9, 210000, 'offered'),
(19, 'Henry', 'He', 'henry.he@email.com', '+1-555-0019', 4, 140000, 'applied'),
(20, 'Evelyn', 'Zheng', 'evelyn.zheng@email.com', '+1-555-0020', 6, 170000, 'rejected'),
(21, 'Alexander', 'Dong', 'alexander.dong@email.com', '+1-555-0021', 7, 180000, 'hired'),
(22, 'Abigail', 'Feng', 'abigail.feng@email.com', '+1-555-0022', 5, 150000, 'interviewing'),
(23, 'Michael', 'Qian', 'michael.qian@email.com', '+1-555-0023', 8, 195000, 'offered'),
(24, 'Emily', 'Lu', 'emily.lu@email.com', '+1-555-0024', 3, 110000, 'screening'),
(25, 'Daniel', 'Yuan', 'daniel.yuan@email.com', '+1-555-0025', 6, 165000, 'withdrawn'),
(26, 'Elizabeth', 'Hou', 'elizabeth.hou@email.com', '+1-555-0026', 7, 175000, 'rejected'),
(27, 'Matthew', 'Xiang', 'matthew.xiang@email.com', '+1-555-0027', 5, 155000, 'applied'),
(28, 'Sofia', 'Ren', 'sofia.ren@email.com', '+1-555-0028', 9, 200000, 'hired'),
(29, 'Andrew', 'Yi', 'andrew.yi@email.com', '+1-555-0029', 4, 140000, 'screening'),
(30, 'Ella', 'Lei', 'ella.lei@email.com', '+1-555-0030', 6, 170000, 'interviewing'),
(31, 'Joshua', 'Dai', 'joshua.dai@email.com', '+1-555-0031', 8, 190000, 'offered'),
(32, 'Grace', 'Fu', 'grace.fu@email.com', '+1-555-0032', 5, 150000, 'rejected'),
(33, 'Ryan', 'Cheng', 'ryan.cheng@email.com', '+1-555-0033', 7, 175000, 'withdrawn'),
(34, 'Lily', 'Zuo', 'lily.zuo@email.com', '+1-555-0034', 4, 145000, 'applied'),
(35, 'Nathan', 'Jian', 'nathan.jian@email.com', '+1-555-0035', 6, 165000, 'screening'),
(36, 'Chloe', 'Qu', 'chloe.qu@email.com', '+1-555-0036', 9, 205000, 'hired'),
(37, 'Leo', 'Fang', 'leo.fang@email.com', '+1-555-0037', 5, 155000, 'interviewing'),
(38, 'Zoey', 'Jiang', 'zoey.jiang@email.com', '+1-555-0038', 7, 180000, 'offered'),
(39, 'Isaac', 'Kong', 'isaac.kong@email.com', '+1-555-0039', 3, 120000, 'rejected'),
(40, 'Penelope', 'Ao', 'penelope.ao@email.com', '+1-555-0040', 8, 195000, 'hired'),
(41, 'Gabriel', 'Xiao', 'gabriel.xiao@email.com', '+1-555-0041', 6, 170000, 'withdrawn'),
(42, 'Victoria', 'Mu', 'victoria.mu@email.com', '+1-555-0042', 5, 150000, 'applied'),
(43, 'Samuel', 'Zhang2', 'samuel.zhang2@email.com', '+1-555-0043', 7, 175000, 'screening'),
(44, 'Hannah', 'Lin2', 'hannah.lin2@email.com', '+1-555-0044', 4, 140000, 'rejected'),
(45, 'Jacob', 'Yu', 'jacob.yu@email.com', '+1-555-0045', 9, 210000, 'offered'),
(46, 'Aurora', 'Pan', 'aurora.pan@email.com', '+1-555-0046', 6, 165000, 'interviewing'),
(47, 'Austin', 'Gao', 'austin.gao@email.com', '+1-555-0047', 5, 155000, 'withdrawn'),
(48, 'Savannah', 'Wei', 'savannah.wei@email.com', '+1-555-0048', 8, 190000, 'hired'),
(49, 'Caleb', 'Xu2', 'caleb.xu2@email.com', '+1-555-0049', 3, 115000, 'applied'),
(50, 'Brooklyn', 'Sun2', 'brooklyn.sun2@email.com', '+1-555-0050', 7, 175000, 'screening'),
(51, 'Alex', 'Smith', 'alex.smith@email.com', '+1-555-0051', 6, 168000, 'applied'),
(52, 'Jordan', 'Johnson', 'jordan.johnson@email.com', '+1-555-0052', 7, 172000, 'screening'),
(53, 'Taylor', 'Williams', 'taylor.williams@email.com', '+1-555-0053', 5, 156000, 'interviewing'),
(54, 'Morgan', 'Brown', 'morgan.brown@email.com', '+1-555-0054', 8, 192000, 'offered'),
(55, 'Casey', 'Jones', 'casey.jones@email.com', '+1-555-0055', 4, 142000, 'applied'),
(56, 'Riley', 'Garcia', 'riley.garcia@email.com', '+1-555-0056', 9, 202000, 'hired'),
(57, 'Quinn', 'Miller', 'quinn.miller@email.com', '+1-555-0057', 6, 166000, 'screening'),
(58, 'Avery', 'Davis', 'avery.davis@email.com', '+1-555-0058', 7, 174000, 'interviewing'),
(59, 'Peyton', 'Rodriguez', 'peyton.rodriguez@email.com', '+1-555-0059', 5, 158000, 'rejected'),
(60, 'Cameron', 'Martinez', 'cameron.martinez@email.com', '+1-555-0060', 8, 188000, 'offered'),
(61, 'Skyler', 'Hernandez', 'skylers.hernandez@email.com', '+1-555-0061', 3, 118000, 'applied'),
(62, 'Kendall', 'Lopez', 'kendall.lopez@email.com', '+1-555-0062', 6, 164000, 'screening'),
(63, 'Austin', 'Gonzales', 'austin.gonzales@email.com', '+1-555-0063', 7, 176000, 'interviewing'),
(64, 'Spencer', 'Wilson', 'spencer.wilson@email.com', '+1-555-0064', 5, 152000, 'withdrawn'),
(65, 'Connor', 'Anderson', 'connor.anderson@email.com', '+1-555-0065', 9, 204000, 'hired'),
(66, 'Dylan', 'Thomas', 'dylan.thomas@email.com', '+1-555-0066', 4, 144000, 'applied'),
(67, 'Riley', 'Taylor', 'riley.taylor@email.com', '+1-555-0067', 6, 168000, 'screening'),
(68, 'Makayla', 'Moore', 'makayla.moore@email.com', '+1-555-0068', 7, 178000, 'offered'),
(69, 'Morgan', 'Jackson', 'morgan.jackson@email.com', '+1-555-0069', 5, 154000, 'rejected'),
(70, 'Kayla', 'White', 'kayla.white@email.com', '+1-555-0070', 8, 196000, 'hired'),
(71, 'Peyton', 'Harris', 'peyton.harris@email.com', '+1-555-0071', 3, 122000, 'applied'),
(72, 'Sydney', 'Martin', 'sydney.martin@email.com', '+1-555-0072', 6, 162000, 'screening'),
(73, 'Kylie', 'Thompson', 'kylie.thompson@email.com', '+1-555-0073', 7, 174000, 'interviewing'),
(74, 'Bella', 'Garcia', 'bella.garcia@email.com', '+1-555-0074', 5, 156000, 'withdrawn'),
(75, 'Autumn', 'Martinez', 'autumn.martinez@email.com', '+1-555-0075', 9, 206000, 'offered'),
(76, 'Savannah', 'Robinson', 'savannah.robinson@email.com', '+1-555-0076', 4, 146000, 'applied'),
(77, 'Hailey', 'Clark', 'hailey.clark@email.com', '+1-555-0077', 6, 167000, 'screening'),
(78, 'Alexis', 'Rodriguez', 'alexis.rodriguez@email.com', '+1-555-0078', 7, 177000, 'interviewing'),
(79, 'Jasmine', 'Lewis', 'jasmine.lewis@email.com', '+1-555-0079', 5, 159000, 'rejected'),
(80, 'Victoria', 'Lee', 'victoria.lee@email.com', '+1-555-0080', 8, 194000, 'hired'),
(81, 'Madison', 'Walker', 'madison.walker@email.com', '+1-555-0081', 3, 112000, 'applied'),
(82, 'Jordan', 'Hall', 'jordan.hall@email.com', '+1-555-0082', 6, 163000, 'screening'),
(83, 'Taylor', 'Allen', 'taylor.allen@email.com', '+1-555-0083', 7, 173000, 'offered'),
(84, 'Morgan', 'Young', 'morgan.young@email.com', '+1-555-0084', 5, 157000, 'withdrawn'),
(85, 'Riley', 'King', 'riley.king@email.com', '+1-555-0085', 9, 208000, 'hired'),
(86, 'Avery', 'Wright', 'avery.wright@email.com', '+1-555-0086', 4, 143000, 'applied'),
(87, 'Peyton', 'Scott', 'peyton.scott@email.com', '+1-555-0087', 6, 165000, 'screening'),
(88, 'Savannah', 'Torres', 'savannah.torres@email.com', '+1-555-0088', 7, 175000, 'interviewing'),
(89, 'Makayla', 'Nguyen', 'makayla.nguyen@email.com', '+1-555-0089', 5, 153000, 'rejected'),
(90, 'Kylie', 'Hill', 'kylie.hill@email.com', '+1-555-0090', 8, 198000, 'offered'),
(91, 'Alexa', 'Flores', 'alexa.flores@email.com', '+1-555-0091', 3, 116000, 'applied'),
(92, 'Autumn', 'Woods', 'autumn.woods@email.com', '+1-555-0092', 6, 161000, 'screening'),
(93, 'Bella', 'Cooper', 'bella.cooper@email.com', '+1-555-0093', 7, 171000, 'interviewing'),
(94, 'Savannah', 'Richardson', 'savannah.richardson@email.com', '+1-555-0094', 5, 155000, 'withdrawn'),
(95, 'Hailey', 'Cox', 'hailey.cox@email.com', '+1-555-0095', 9, 203000, 'hired'),
(96, 'Jasmine', 'Howard', 'jasmine.howard@email.com', '+1-555-0096', 4, 145000, 'applied'),
(97, 'Victoria', 'Ward', 'victoria.ward@email.com', '+1-555-0097', 6, 169000, 'screening'),
(98, 'Madison', 'Torres', 'madison.torres@email.com', '+1-555-0098', 7, 179000, 'offered'),
(99, 'Jordan', 'Peterson', 'jordan.peterson@email.com', '+1-555-0099', 5, 151000, 'rejected'),
(100, 'Taylor', 'Gray', 'taylor.gray@email.com', '+1-555-0100', 8, 191000, 'hired');

-- Insert candidates 101-500 with generated data
INSERT INTO candidates (first_name, last_name, email, phone, years_of_experience, expected_salary, status)
SELECT
    'Candidate_' || i,
    'Test_' || i,
    'candidate.' || i || '@test.com',
    '+1-555-' || LPAD(i::text, 4, '0'),
    (floor(random() * 10) + 1)::integer,
    (floor(random() * 100000) + 100000)::decimal(12, 2),
    (ARRAY['applied', 'screening', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn', 'hired', 'on_hold'])[floor(random() * 9) + 1]::candidate_status_enum
FROM generate_series(101, 500) AS i;

-- Insert candidates 501-1500 with different pattern
INSERT INTO candidates (first_name, last_name, email, phone, years_of_experience, expected_salary, status)
SELECT
    (ARRAY['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Peyton', 'Cameron', 'Skyler', 'Kendall', 'Austin', 'Spencer', 'Connor'])[floor(random() * 15) + 1],
    (ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'])[floor(random() * 15) + 1],
    'applicant.' || i || '@email.com',
    '+1-555-' || LPAD((i + 1000)::text, 4, '0'),
    (floor(random() * 15) + 1)::integer,
    (floor(random() * 120000) + 90000)::decimal(12, 2),
    (ARRAY['applied', 'screening', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn', 'hired', 'on_hold'])[floor(random() * 9) + 1]::candidate_status_enum
FROM generate_series(501, 1500) AS i;

-- Reset sequence
SELECT setval('candidates_id_seq', 1500);

-- ============================================================================
-- APPLICATIONS, INTERVIEWS, OFFERS
-- ============================================================================

-- Create applications for candidates
INSERT INTO candidate_position_applications (candidate_id, position_id, applied_date, status)
SELECT
    c.id,
    (random() * 49 + 1)::integer,
    '2024-01-01'::date + (random() * 180)::integer * interval '1 day',
    (ARRAY['applied', 'screening', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn'])[floor(random() * 7 + 1)]::application_status_enum
FROM candidates c
WHERE c.id <= 1200;

-- Interviewers (100 interviewers from employees)
INSERT INTO interviewers (employee_id, expertise_areas, interview_types, years_of_experience, is_active)
SELECT
    id,
    ARRAY[
        (ARRAY['Java', 'Python', 'JavaScript', 'Go', 'Rust', 'C++', 'TypeScript', 'Ruby', 'PHP', 'Swift', 'SQL', 'Kubernetes', 'AWS', 'GCP'])[floor(random() * 15 + 1)],
        (ARRAY['System Design', 'APIs', 'Databases', 'Frontend', 'Backend', 'DevOps', 'Security', 'Testing', 'Architecture', 'Machine Learning', 'Data Analysis'])[floor(random() * 12 + 1)]
    ],
    ARRAY[
        (ARRAY['hr_screen', 'technical', 'coding_challenge', 'system_design', 'behavioral', 'presentation', 'culture_fit'])[floor(random() * 7 + 1)]::interview_type_enum,
        (ARRAY['hr_screen', 'technical', 'coding_challenge', 'system_design', 'behavioral'])[floor(random() * 5 + 1)]::interview_type_enum
    ],
    (random() * 15 + 3)::integer,
    random() > 0.1
FROM employees
WHERE id <= 100;

-- Interview rounds for positions
INSERT INTO interview_rounds (position_id, round_name, round_order, interview_type, duration_minutes)
SELECT
    p.id,
    (ARRAY['HR Screen', 'Technical Screen', 'Coding Challenge', 'System Design', 'Behavioral', 'Final Interview', 'Culture Fit'])[s],
    s,
    (ARRAY['hr_screen', 'technical', 'coding_challenge', 'system_design', 'behavioral', 'presentation', 'culture_fit'])[floor(random() * 7 + 1)]::interview_type_enum,
    (ARRAY[30, 45, 60, 75, 90])[floor(random() * 5 + 1)]
FROM positions p
CROSS JOIN (SELECT generate_series(1, 4) AS s) AS rounds
GROUP BY p.id, s;

-- Interview schedules (600+ schedules)
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, status)
SELECT
    a.id,
    (random() * 200 + 1)::integer,
    (random() * 100 + 1)::integer,
    '2024-01-01'::timestamp + (random() * 180)::integer * interval '1 day',
    '2024-01-01'::timestamp + (random() * 180)::integer * interval '1 day' + INTERVAL '1 hour',
    (ARRAY['Remote', 'Office', 'Phone', 'Video Call'])[floor(random() * 4 + 1)],
    (ARRAY['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'])[floor(random() * 5 + 1)]::interview_status_enum
FROM candidate_position_applications a
WHERE a.id <= 600;

-- Evaluation criteria
INSERT INTO evaluation_criteria (name, category, max_score) VALUES
('Technical Skills', 'Technical', 5),
('Problem Solving', 'Technical', 5),
('Communication', 'Behavioral', 5),
('Culture Fit', 'Behavioral', 5),
('Leadership', 'Behavioral', 5),
('System Design', 'Technical', 5),
('Code Quality', 'Technical', 5),
('Team Collaboration', 'Behavioral', 5),
('Learning Ability', 'Technical', 5),
('Domain Knowledge', 'Technical', 5);

-- Interview results (400+ results for completed interviews)
INSERT INTO interview_results (schedule_id, interviewer_id, overall_rating, recommendation, feedback_summary, technical_score, communication_score)
SELECT
    s.id,
    s.interviewer_id,
    (random() * 4 + 1)::integer,
    (ARRAY['strong_reject', 'reject', 'weak_hire', 'hire', 'strong_hire'])[floor(random() * 5 + 1)]::recommendation_enum,
    'Feedback provided for this candidate.',
    (random() * 4 + 1)::integer,
    (random() * 4 + 1)::integer
FROM interview_schedules s
WHERE s.status = 'completed' AND s.id <= 400;

-- Interview feedback summaries for applications with completed interviews
INSERT INTO interview_feedback_summary (application_id, total_interviews, completed_interviews, average_rating, final_recommendation, created_at)
SELECT
    application_id,
    COUNT(*) as total_interviews,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_interviews,
    (random() * 2 + 3)::numeric(3, 2),
    (ARRAY['strong_reject', 'reject', 'weak_hire', 'hire', 'strong_hire'])[floor(random() * 5 + 1)]::recommendation_enum,
    CURRENT_TIMESTAMP
FROM interview_schedules
GROUP BY application_id
HAVING COUNT(*) > 0 AND COUNT(*) FILTER (WHERE status = 'completed') > 0;

-- Offers (120+ offers)
INSERT INTO offers (application_id, base_salary, bonus_percentage, stock_options, benefits, start_date, status)
SELECT
    a.id,
    (random() * 80000 + 100000)::numeric(12, 2),
    (random() * 20)::numeric(5, 2),
    (random() * 50000)::numeric(12, 2),
    'Full benefits package including health, dental, and vision insurance.',
    '2024-06-01'::date + (random() * 90)::integer * interval '1 day',
    (ARRAY['draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn'])[floor(random() * 6 + 1)]::offer_status_enum
FROM candidate_position_applications a
WHERE a.status IN ('accepted', 'offered')
LIMIT 120;

-- ============================================================================
-- UPDATE STATISTICS
-- ============================================================================

-- Update positions headcount filled
UPDATE positions p
SET headcount_filled = (
    SELECT COUNT(DISTINCT c.id)
    FROM candidates c
    JOIN candidate_position_applications a ON c.id = a.candidate_id
    WHERE a.position_id = p.id AND c.status = 'hired'
);

-- Update some candidate statuses based on offers
UPDATE candidates
SET status = 'hired'
WHERE id IN (
    SELECT DISTINCT c.id
    FROM candidates c
    JOIN candidate_position_applications a ON c.id = a.candidate_id
    JOIN offers o ON a.id = o.application_id
    WHERE o.status = 'accepted'
    LIMIT 50
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Interview DB Created Successfully!';
    RAISE NOTICE 'Departments: %', (SELECT COUNT(*) FROM departments);
    RAISE NOTICE 'Employees: %', (SELECT COUNT(*) FROM employees);
    RAISE NOTICE 'Positions: %', (SELECT COUNT(*) FROM positions);
    RAISE NOTICE 'Candidates: %', (SELECT COUNT(*) FROM candidates);
    RAISE NOTICE 'Applications: %', (SELECT COUNT(*) FROM candidate_position_applications);
    RAISE NOTICE 'Interviewers: %', (SELECT COUNT(*) FROM interviewers);
    RAISE NOTICE 'Interview Rounds: %', (SELECT COUNT(*) FROM interview_rounds);
    RAISE NOTICE 'Schedules: %', (SELECT COUNT(*) FROM interview_schedules);
    RAISE NOTICE 'Results: %', (SELECT COUNT(*) FROM interview_results);
    RAISE NOTICE 'Feedback Summaries: %', (SELECT COUNT(*) FROM interview_feedback_summary);
    RAISE NOTICE 'Offers: %', (SELECT COUNT(*) FROM offers);
    RAISE NOTICE 'Connection: postgresql://postgres@localhost:5432/interview_db';
    RAISE NOTICE '========================================';
END $$;
