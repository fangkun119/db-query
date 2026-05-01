-- ============================================================================
-- Interview Management Database - Complete Test Database
-- Version: 2.0 Final
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

-- Departments
INSERT INTO departments (name, code, location) VALUES
('Engineering', 'ENG', 'San Francisco'),
('Design', 'DSN', 'San Francisco'),
('Human Resources', 'HR', 'Austin');

-- Employees
INSERT INTO employees (employee_code, first_name, last_name, email, department_id, position) VALUES
('EMP001', 'Chen', 'Wei', 'chen.wei@company.com', 1, 'Engineering Manager'),
('EMP002', 'Sarah', 'Johnson', 'sarah.j@company.com', 1, 'Senior Software Engineer'),
('EMP003', 'David', 'Kim', 'david.kim@company.com', 2, 'Design Director'),
('EMP004', 'Jennifer', 'Liu', 'jennifer.liu@company.com', 2, 'Senior UX Designer'),
('EMP005', 'Daniel', 'Brown', 'daniel.brown@company.com', 3, 'HR Manager'),
('EMP006', 'Laura', 'Garcia', 'laura.garcia@company.com', 3, 'HR Business Partner');

-- Positions
INSERT INTO positions (title, code, department_id, min_salary, max_salary, headcount) VALUES
('Senior Software Engineer', 'SSE-01', 1, 150000, 200000, 2),
('Senior UX Designer', 'UXD-01', 2, 140000, 180000, 1),
('DevOps Engineer', 'DEV-01', 1, 130000, 170000, 1);

-- Candidates
INSERT INTO candidates (first_name, last_name, email, years_of_experience, expected_salary) VALUES
('James', 'Zhang', 'james.z@email.com', 7, 180000),
('Emma', 'Chen', 'emma.chen@email.com', 7, 170000),
('Daniel', 'Anderson', 'daniel.a@email.com', 5, 160000);

-- Applications
INSERT INTO candidate_position_applications (candidate_id, position_id, status) VALUES
(1, 1, 'accepted'),
(2, 2, 'accepted'),
(3, 3, 'accepted');

-- Interviewers
INSERT INTO interviewers (employee_id, expertise_areas, interview_types, years_of_experience) VALUES
(1, ARRAY['System Design'], ARRAY['technical'::interview_type_enum, 'system_design'::interview_type_enum], 15),
(2, ARRAY['Java', 'Python'], ARRAY['technical'::interview_type_enum, 'coding_challenge'::interview_type_enum], 12),
(3, ARRAY['UX Design'], ARRAY['presentation'::interview_type_enum], 12),
(4, ARRAY['UX Research'], ARRAY['presentation'::interview_type_enum], 6),
(5, ARRAY['HR'], ARRAY['hr_screen'::interview_type_enum], 10),
(6, ARRAY['HR'], ARRAY['hr_screen'::interview_type_enum], 5);

-- Interview Rounds
INSERT INTO interview_rounds (position_id, round_name, round_order, interview_type, duration_minutes) VALUES
(1, 'HR Screen', 1, 'hr_screen', 30),
(1, 'Technical', 2, 'technical', 60),
(1, 'System Design', 3, 'system_design', 60),
(2, 'HR Screen', 1, 'hr_screen', 30),
(2, 'Design Presentation', 2, 'presentation', 60),
(3, 'HR Screen', 1, 'hr_screen', 30),
(3, 'Technical', 2, 'technical', 60);

-- Evaluation Criteria
INSERT INTO evaluation_criteria (name, category) VALUES
('Technical Skills', 'Technical'),
('Problem Solving', 'Technical'),
('Communication', 'Behavioral'),
('Culture Fit', 'Behavioral');

-- Interview Schedules
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, status) VALUES
(1, 1, 5, '2024-03-28 10:00', '2024-03-28 10:30', 'Phone', 'completed'),
(1, 2, 2, '2024-03-30 14:00', '2024-03-30 15:00', 'Remote', 'completed'),
(1, 3, 1, '2024-04-02 15:00', '2024-04-02 16:00', 'Office', 'completed'),
(2, 4, 5, '2024-03-12 10:00', '2024-03-12 10:30', 'Phone', 'completed'),
(2, 5, 3, '2024-03-14 14:00', '2024-03-14 15:00', 'Office', 'completed'),
(2, 6, 4, '2024-03-18 15:00', '2024-03-18 15:45', 'Office', 'completed'),
(3, 7, 5, '2024-03-15 10:00', '2024-03-15 10:30', 'Phone', 'completed'),
(3, 7, 2, '2024-03-18 14:00', '2024-03-18 15:00', 'Remote', 'completed');

-- Interview Results
INSERT INTO interview_results (schedule_id, interviewer_id, overall_rating, recommendation, feedback_summary, technical_score, communication_score) VALUES
(1, 5, 4, 'hire', 'Strong candidate', 4, 4),
(2, 2, 5, 'strong_hire', 'Excellent', 5, 5),
(3, 1, 4, 'hire', 'Good design', 5, 4),
(4, 5, 5, 'strong_hire', 'Outstanding', 4, 5),
(5, 3, 5, 'strong_hire', 'Top talent', 5, 5),
(6, 4, 5, 'strong_hire', 'Great fit', 5, 5),
(7, 5, 4, 'hire', 'Good DevOps', 4, 4),
(8, 2, 5, 'strong_hire', 'Excellent', 5, 5);

-- Feedback Summary
INSERT INTO interview_feedback_summary (application_id, total_interviews, completed_interviews, average_rating, final_recommendation) VALUES
(1, 3, 3, 4.33, 'hire'),
(2, 3, 3, 5.00, 'strong_hire'),
(3, 2, 2, 4.50, 'strong_hire');

-- Offers
INSERT INTO offers (application_id, base_salary, bonus_percentage, stock_options, benefits, start_date, status) VALUES
(2, 165000, 15.0, 50000, 'Full benefits', '2024-05-01', 'accepted'),
(3, 170000, 12.0, 40000, 'Full benefits', '2024-05-15', 'accepted');

-- Update status
UPDATE candidates SET status = 'hired' WHERE id IN (1, 2, 3);
UPDATE positions SET headcount_filled = 1 WHERE id IN (2, 3);

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
    RAISE NOTICE 'Schedules: %', (SELECT COUNT(*) FROM interview_schedules);
    RAISE NOTICE 'Results: %', (SELECT COUNT(*) FROM interview_results);
    RAISE NOTICE 'Offers: %', (SELECT COUNT(*) FROM offers);
    RAISE NOTICE 'Connection: postgresql://postgres@localhost:5432/interview_db';
    RAISE NOTICE '========================================';
END $$;
