-- ============================================================================
-- FIX: Re-run failed seed data for interview_db
-- ============================================================================

\c interview_db;

-- Insert Interviewers with correct enum type
TRUNCATE interviewers CASCADE;
INSERT INTO interviewers (employee_id, expertise_areas, interview_types, years_of_experience, is_active) VALUES
(1, ARRAY['System Design', 'Architecture', 'Leadership'], ARRAY['technical'::interview_type_enum, 'system_design'::interview_type_enum, 'behavioral'::interview_type_enum], 15, true),
(2, ARRAY['Java', 'Python', 'Distributed Systems', 'Backend'], ARRAY['technical'::interview_type_enum, 'coding_challenge'::interview_type_enum], 12, true),
(3, ARRAY['Frontend', 'React', 'JavaScript', 'TypeScript'], ARRAY['technical'::interview_type_enum, 'coding_challenge'::interview_type_enum], 10, true),
(4, ARRAY['Product Strategy', 'Roadmapping', 'User Research'], ARRAY['behavioral'::interview_type_enum, 'hr_screen'::interview_type_enum], 8, true),
(5, ARRAY['UX Design', 'UI Design', 'User Research'], ARRAY['presentation'::interview_type_enum, 'behavioral'::interview_type_enum], 12, true),
(6, ARRAY['UX Research', 'Interaction Design', 'Design Systems'], ARRAY['presentation'::interview_type_enum, 'behavioral'::interview_type_enum], 6, true),
(7, ARRAY['Marketing Strategy', 'Growth', 'Analytics'], ARRAY['behavioral'::interview_type_enum, 'presentation'::interview_type_enum], 10, true),
(11, ARRAY['HR Policies', 'Culture Fit', 'Compensation'], ARRAY['hr_screen'::interview_type_enum, 'behavioral'::interview_type_enum, 'culture_fit'::interview_type_enum], 10, true),
(12, ARRAY['HR Operations', 'Recruiting', 'Onboarding'], ARRAY['hr_screen'::interview_type_enum, 'behavioral'::interview_type_enum], 5, true);

-- Insert Interview Rounds for Senior Software Engineer (id=1) - get correct IDs
SELECT id, round_name FROM interview_rounds ORDER BY id LIMIT 10;

-- Check current round IDs
DO $$
DECLARE
    v_round_id INTEGER;
BEGIN
    -- Get first round ID for Senior Software Engineer position
    SELECT id INTO v_round_id FROM interview_rounds WHERE position_id = 1 AND round_order = 1;
    RAISE NOTICE 'First round ID for SSE position: %', v_round_id;

    -- Get existing schedules
    RAISE NOTICE 'Current schedules: %', (SELECT COUNT(*) FROM interview_schedules);
END $$;

-- Clear and re-insert interview schedules with correct interviewer and time values
TRUNCATE interview_schedules CASCADE;
ALTER TABLE interview_schedules DROP CONSTRAINT IF EXISTS interview_schedules_interviewer_id_fkey;
ALTER TABLE interview_schedules ADD CONSTRAINT interview_schedules_interviewer_id_fkey
    FOREIGN KEY (interviewer_id) REFERENCES interviewers(id) ON DELETE RESTRICT;

-- Insert Interview Schedules for James Zhang (Application 1)
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
(1, (SELECT id FROM interview_rounds WHERE position_id = 1 AND round_order = 1), 11, '2024-03-28 10:00:00', '2024-03-28 10:30:00', 'Phone', NULL, 'completed', 11),
(1, (SELECT id FROM interview_rounds WHERE position_id = 1 AND round_order = 2), 2, '2024-03-30 14:00:00', '2024-03-30 15:00:00', 'Remote', 'https://meet.google.com/abc-defg-hij', 'completed', 2),
(1, (SELECT id FROM interview_rounds WHERE position_id = 1 AND round_order = 3), 1, '2024-04-02 15:00:00', '2024-04-02 16:00:00', 'Office - Room 3A', NULL, 'completed', 1),
(1, (SELECT id FROM interview_rounds WHERE position_id = 1 AND round_order = 4), 11, '2024-04-04 11:00:00', '2024-04-04 11:45:00', 'Office - Room 2B', NULL, 'completed', 11);

-- Insert Interview Schedules for Emma Chen (Application 4) - Offered
-- First, create rounds for Senior UX Designer position
INSERT INTO interview_rounds (position_id, round_name, round_order, interview_type, duration_minutes, description, is_mandatory) VALUES
(7, 'HR Phone Screen', 1, 'hr_screen', 30, 'Initial screening', true),
(7, 'Design Presentation', 2, 'presentation', 60, 'Present design portfolio', true),
(7, 'Design Interview', 3, 'behavioral', 45, 'Assess design thinking and collaboration', true)
ON CONFLICT DO NOTHING;

INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
(4, (SELECT id FROM interview_rounds WHERE position_id = 7 AND round_order = 1), 11, '2024-03-12 10:00:00', '2024-03-12 10:30:00', 'Phone', NULL, 'completed', 11),
(4, (SELECT id FROM interview_rounds WHERE position_id = 7 AND round_order = 2), 6, '2024-03-14 14:00:00', '2024-03-14 15:00:00', 'Office - Design Studio', NULL, 'completed', 5),
(4, (SELECT id FROM interview_rounds WHERE position_id = 7 AND round_order = 3), 5, '2024-03-18 15:00:00', '2024-03-18 15:45:00', 'Office - Design Studio', NULL, 'completed', 5);

-- Insert Interview Schedules for Daniel Anderson (Application 11) - Offered
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
(11, (SELECT id FROM interview_rounds WHERE position_id = 4 AND round_order = 1), 11, '2024-03-15 10:00:00', '2024-03-15 10:30:00', 'Phone', NULL, 'completed', 11),
(11, (SELECT id FROM interview_rounds WHERE position_id = 4 AND round_order = 2), 2, '2024-03-18 14:00:00', '2024-03-18 15:00:00', 'Remote', 'https://meet.google.com/daniel-devops', 'completed', 2);

-- Re-insert interview results (clear first)
TRUNCATE interview_results CASCADE;
TRUNCATE interview_scores CASCADE;

-- Get correct schedule IDs and insert results
INSERT INTO interview_results (schedule_id, interviewer_id, overall_rating, recommendation, feedback_summary, technical_score, communication_score, culture_fit_score, problem_solving_score, strengths, weaknesses, notes) VALUES
((SELECT id FROM interview_schedules WHERE application_id = 1 ORDER BY scheduled_start_time LIMIT 1), 11, 4, 'hire', 'Strong candidate with solid technical background', 4, 4, 5, 4, ARRAY['Strong technical foundation', 'Good communication'], ARRAY['Could improve on system design depth'], 'Pass to next round'),
((SELECT id FROM interview_schedules WHERE application_id = 1 ORDER BY scheduled_start_time OFFSET 1 LIMIT 1), 2, 5, 'strong_hire', 'Excellent coding skills and problem solving', 5, 5, 4, 5, ARRAY['Clean code', 'Fast problem solving', 'Good system design thinking'], ARRAY['None observed'], 'Strong hire recommendation'),
((SELECT id FROM interview_schedules WHERE application_id = 4 ORDER BY scheduled_start_time LIMIT 1), 11, 5, 'strong_hire', 'Outstanding portfolio and design philosophy', 4, 5, 5, 5, ARRAY['Exceptional portfolio', 'Strong design thinking', 'Great communicator'], ARRAY['None'], 'Must hire candidate'),
((SELECT id FROM interview_schedules WHERE application_id = 4 ORDER BY scheduled_start_time OFFSET 1 LIMIT 1), 6, 5, 'strong_hire', 'Top-tier UX talent, would be great addition', 5, 5, 5, 5, ARRAY['Beautiful designs', 'User-centered approach'], ARRAY['None observed'], 'Strong hire'),
((SELECT id FROM interview_schedules WHERE application_id = 4 ORDER BY scheduled_start_time OFFSET 2 LIMIT 1), 5, 5, 'strong_hire', 'Excellent design leadership potential', 5, 5, 5, 5, ARRAY['Design system experience', 'Leadership skills'], ARRAY['None'], 'Ready for senior role'),
((SELECT id FROM interview_schedules WHERE application_id = 11 ORDER BY scheduled_start_time LIMIT 1), 11, 4, 'hire', 'Good candidate for DevOps role', 4, 4, 4, 4, ARRAY['Strong infrastructure knowledge', 'Good experience'], ARRAY['Limited cloud exposure'], 'Hire'),
((SELECT id FROM interview_schedules WHERE application_id = 11 ORDER BY scheduled_start_time OFFSET 1 LIMIT 1), 2, 5, 'strong_hire', 'Excellent technical skills in DevOps', 5, 5, 5, 5, ARRAY['Expert in Docker/K8s', 'Great problem solver'], ARRAY['None'], 'Strong hire');

-- Insert detailed scores
TRUNCATE interview_scores CASCADE;
INSERT INTO interview_scores (interview_result_id, criterion_id, score, comments) VALUES
((SELECT id FROM interview_results WHERE schedule_id = (SELECT id FROM interview_schedules WHERE application_id = 1 ORDER BY scheduled_start_time OFFSET 1 LIMIT 1)), 1, 5, 'Excellent Python and Java skills'),
((SELECT id FROM interview_results WHERE schedule_id = (SELECT id FROM interview_schedules WHERE application_id = 1 ORDER BY scheduled_start_time OFFSET 1 LIMIT 1)), 2, 5, 'Solved complex problem efficiently'),
((SELECT id FROM interview_results WHERE schedule_id = (SELECT id FROM interview_schedules WHERE application_id = 1 ORDER BY scheduled_start_time OFFSET 1 LIMIT 1)), 3, 5, 'Clean, production-quality code');

-- Update feedback summaries
TRUNCATE interview_feedback_summary CASCADE;
INSERT INTO interview_feedback_summary (application_id, total_interviews, completed_interviews, average_rating, final_recommendation, hiring_decision, decided_by, decided_at) VALUES
(1, 4, 4, 4.25, 'hire', 'hire - extend offer', 1, '2024-04-04 12:00:00'),
(4, 3, 3, 5.00, 'strong_hire', 'hire - extend offer', 5, '2024-03-18 17:00:00'),
(11, 2, 2, 4.50, 'strong_hire', 'hire - extend offer', 1, '2024-03-20 16:00:00');

-- Re-insert offers (they were OK)
TRUNCATE offers CASCADE;
TRUNCATE offer_approvals CASCADE;
INSERT INTO offers (application_id, base_salary, bonus_percentage, stock_options, joining_bonus, benefits, start_date, expiry_date, status, created_by) VALUES
(4, 165000.00, 15.0, 50000.00, 10000.00, 'Health, Dental, Vision, 401k, Unlimited PTO, Remote Work', '2024-05-01', '2024-04-15', 'accepted', 5),
(11, 170000.00, 12.0, 40000.00, 8000.00, 'Health, Dental, Vision, 401k, 4 weeks PTO, Learning Budget', '2024-05-15', '2024-04-20', 'accepted', 1);

INSERT INTO offer_approvals (offer_id, approver_id, approval_level, status, comments, approved_at) VALUES
(1, 1, 1, 'approved', 'Approved - strong candidate', '2024-03-25 10:00:00'),
(1, 4, 2, 'approved', 'Approved - budget available', '2024-03-25 14:00:00'),
(2, 1, 1, 'approved', 'Approved - much needed', '2024-03-28 11:00:00'),
(2, 4, 2, 'approved', 'Approved - within range', '2024-03-28 15:00:00');

-- Insert some upcoming interviews
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
(8, (SELECT id FROM interview_rounds WHERE position_id = 6 AND round_order = 1), 11, '2024-05-05 10:00:00', '2024-05-05 10:30:00', 'Phone', NULL, 'confirmed', 11),
(12, (SELECT id FROM interview_rounds WHERE position_id = 1 AND round_order = 1), 11, '2024-05-06 14:00:00', '2024-05-06 14:30:00', 'Phone', NULL, 'confirmed', 11);

-- Final verification
DO $$
DECLARE
    v_interviewers INTEGER;
    v_schedules INTEGER;
    v_results INTEGER;
    v_offers INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_interviewers FROM interviewers;
    SELECT COUNT(*) INTO v_schedules FROM interview_schedules;
    SELECT COUNT(*) INTO v_results FROM interview_results;
    SELECT COUNT(*) INTO v_offers FROM offers;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'FIX APPLIED SUCCESSFULLY!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Interviewers: %', v_interviewers;
    RAISE NOTICE 'Interview Schedules: %', v_schedules;
    RAISE NOTICE 'Interview Results: %', v_results;
    RAISE NOTICE 'Offers: %', v_offers;
    RAISE NOTICE '============================================================================';
END $$;
