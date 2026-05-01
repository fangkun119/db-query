-- ============================================================================
-- FINAL FIX: Correct seed data for interview_db
-- ============================================================================

\c interview_db;

-- Clear all dependent data first
TRUNCATE interview_scores CASCADE;
TRUNCATE interview_results CASCADE;
TRUNCATE interview_schedules CASCADE;
TRUNCATE interview_feedback_summary CASCADE;
TRUNCATE offer_approvals CASCADE;
TRUNCATE offers CASCADE;

-- Insert Interview Schedules with CORRECT interviewer IDs
-- Interviewer IDs: 1=Chen Wei, 2=Sarah Johnson, 3=Michael Chen, 4=Emily Rodriguez,
--                   5=David Kim, 6=Jennifer Liu, 7=Robert Taylor, 8=Daniel Brown(HR), 9=Laura Garcia(HR)

-- James Zhang (Application 1) - Senior Software Engineer
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
(1, 1, 8, '2024-03-28 10:00:00', '2024-03-28 10:30:00', 'Phone', NULL, 'completed', 8),
(1, 2, 2, '2024-03-30 14:00:00', '2024-03-30 15:00:00', 'Remote', 'https://meet.google.com/abc-defg-hij', 'completed', 2),
(1, 3, 1, '2024-04-02 15:00:00', '2024-04-02 16:00:00', 'Office - Room 3A', NULL, 'completed', 1),
(1, 4, 8, '2024-04-04 11:00:00', '2024-04-04 11:45:00', 'Office - Room 2B', NULL, 'completed', 8);

-- Emma Chen (Application 4) - Senior UX Designer (with rounds)
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
(4, 9, 8, '2024-03-12 10:00:00', '2024-03-12 10:30:00', 'Phone', NULL, 'completed', 8),
(4, 10, 6, '2024-03-14 14:00:00', '2024-03-14 15:00:00', 'Office - Design Studio', NULL, 'completed', 5),
(4, 11, 5, '2024-03-18 15:00:00', '2024-03-18 15:45:00', 'Office - Design Studio', NULL, 'completed', 5);

-- Daniel Anderson (Application 11) - DevOps Engineer
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
(11, 1, 8, '2024-03-15 10:00:00', '2024-03-15 10:30:00', 'Phone', NULL, 'completed', 8),
(11, 2, 2, '2024-03-18 14:00:00', '2024-03-18 15:00:00', 'Remote', 'https://meet.google.com/daniel-devops', 'completed', 2);

-- Insert Interview Results
INSERT INTO interview_results (schedule_id, interviewer_id, overall_rating, recommendation, feedback_summary, technical_score, communication_score, culture_fit_score, problem_solving_score, strengths, weaknesses, notes) VALUES
-- James Zhang's interviews
(1, 8, 4, 'hire', 'Strong candidate with solid technical background', 4, 4, 5, 4, ARRAY['Strong technical foundation', 'Good communication'], ARRAY['Could improve on system design depth'], 'Pass to next round'),
(2, 2, 5, 'strong_hire', 'Excellent coding skills and problem solving', 5, 5, 4, 5, ARRAY['Clean code', 'Fast problem solving', 'Good system design thinking'], ARRAY['None observed'], 'Strong hire recommendation'),
(3, 1, 4, 'hire', 'Good system design knowledge', 5, 4, 4, 4, ARRAY['Scalable thinking', 'Pragmatic approach'], ARRAY['Could elaborate more on trade-offs'], 'Solid system design skills'),
(4, 8, 4, 'hire', 'Good cultural fit, aligned with values', 4, 5, 4, 4, ARRAY['Team oriented', 'Growth mindset'], ARRAY['None significant'], 'Would work well with the team'),
-- Emma Chen's interviews
(5, 8, 5, 'strong_hire', 'Outstanding portfolio and design philosophy', 4, 5, 5, 5, ARRAY['Exceptional portfolio', 'Strong design thinking', 'Great communicator'], ARRAY['None'], 'Must hire candidate'),
(6, 6, 5, 'strong_hire', 'Top-tier UX talent, would be great addition', 5, 5, 5, 5, ARRAY['Beautiful designs', 'User-centered approach'], ARRAY['None observed'], 'Strong hire'),
(7, 5, 5, 'strong_hire', 'Excellent design leadership potential', 5, 5, 5, 5, ARRAY['Design system experience', 'Leadership skills'], ARRAY['None'], 'Ready for senior role'),
-- Daniel Anderson's interviews
(8, 8, 4, 'hire', 'Good candidate for DevOps role', 4, 4, 4, 4, ARRAY['Strong infrastructure knowledge', 'Good experience'], ARRAY['Limited cloud exposure'], 'Hire'),
(9, 2, 5, 'strong_hire', 'Excellent technical skills in DevOps', 5, 5, 5, 5, ARRAY['Expert in Docker/K8s', 'Great problem solver'], ARRAY['None'], 'Strong hire');

-- Insert detailed scores
INSERT INTO interview_scores (interview_result_id, criterion_id, score, comments) VALUES
(2, 1, 5, 'Excellent Python and Java skills'),
(2, 2, 5, 'Solved complex problem efficiently'),
(2, 3, 5, 'Clean, production-quality code'),
(2, 5, 5, 'Clear and articulate'),
(3, 4, 5, 'Designed a highly scalable solution'),
(3, 2, 5, 'Excellent problem decomposition'),
(3, 5, 5, 'Explained trade-offs clearly'),
(3, 6, 5, 'Collaborative approach evident');

-- Insert feedback summaries
INSERT INTO interview_feedback_summary (application_id, total_interviews, completed_interviews, average_rating, final_recommendation, hiring_decision, decided_by, decided_at) VALUES
(1, 4, 4, 4.25, 'hire', 'hire - extend offer', 1, '2024-04-04 12:00:00'),
(4, 3, 3, 5.00, 'strong_hire', 'hire - extend offer', 5, '2024-03-18 17:00:00'),
(11, 2, 2, 4.50, 'strong_hire', 'hire - extend offer', 1, '2024-03-20 16:00:00');

-- Insert offers
INSERT INTO offers (application_id, base_salary, bonus_percentage, stock_options, joining_bonus, benefits, start_date, expiry_date, status, created_by) VALUES
(4, 165000.00, 15.0, 50000.00, 10000.00, 'Health, Dental, Vision, 401k, Unlimited PTO, Remote Work', '2024-05-01', '2024-04-15', 'accepted', 5),
(11, 170000.00, 12.0, 40000.00, 8000.00, 'Health, Dental, Vision, 401k, 4 weeks PTO, Learning Budget', '2024-05-15', '2024-04-20', 'accepted', 1);

-- Insert offer approvals
INSERT INTO offer_approvals (offer_id, approver_id, approval_level, status, comments, approved_at) VALUES
-- Emma Chen's offer approvals
(1, 1, 1, 'approved', 'Approved - strong candidate', '2024-03-25 10:00:00'),
(1, 4, 2, 'approved', 'Approved - budget available', '2024-03-25 14:00:00'),
-- Daniel Anderson's offer approvals
(2, 1, 1, 'approved', 'Approved - much needed', '2024-03-28 11:00:00'),
(2, 4, 2, 'approved', 'Approved - within range', '2024-03-28 15:00:00');

-- Insert upcoming interviews
INSERT INTO interview_schedules (application_id, round_id, interviewer_id, scheduled_start_time, scheduled_end_time, location, meeting_link, status, created_by) VALUES
-- Jennifer Liu (Application 8) - Product Manager
(8, 6, 8, '2024-05-05 10:00:00', '2024-05-05 10:30:00', 'Phone', NULL, 'confirmed', 8),
-- Grace Wilson (Application 12) - Enterprise Account Executive
(12, 1, 8, '2024-05-06 14:00:00', '2024-05-06 14:30:00', 'Phone', NULL, 'confirmed', 8),
-- Ethan White (Application 15) - Junior Software Engineer
(15, 1, 8, '2024-05-07 11:00:00', '2024-05-07 11:30:00', 'Phone', NULL, 'scheduled', 8);

-- Update candidate statuses
UPDATE candidates SET status = 'offered' WHERE id = 4;  -- Emma Chen
UPDATE candidates SET status = 'offered' WHERE id = 11; -- Daniel Anderson
UPDATE candidates SET status = 'hired' WHERE id = 4;   -- Emma Chen accepted
UPDATE candidates SET status = 'hired' WHERE id = 11;  -- Daniel Anderson accepted

-- Update application statuses
UPDATE candidate_position_applications SET status = 'offered' WHERE id = 4;
UPDATE candidate_position_applications SET status = 'offered' WHERE id = 11;
UPDATE candidate_position_applications SET status = 'accepted' WHERE id = 4;
UPDATE candidate_position_applications SET status = 'accepted' WHERE id = 11;

-- Update position filled counts
UPDATE positions SET headcount_filled = 1 WHERE id = 7;  -- Senior UX Designer filled
UPDATE positions SET headcount_filled = 1 WHERE id = 4;  -- DevOps Engineer filled

-- Final verification
DO $$
DECLARE
    v_departments INTEGER;
    v_employees INTEGER;
    v_positions INTEGER;
    v_candidates INTEGER;
    v_applications INTEGER;
    v_rounds INTEGER;
    v_interviewers INTEGER;
    v_schedules INTEGER;
    v_results INTEGER;
    v_offers INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_departments FROM departments;
    SELECT COUNT(*) INTO v_employees FROM employees;
    SELECT COUNT(*) INTO v_positions FROM positions;
    SELECT COUNT(*) INTO v_candidates FROM candidates;
    SELECT COUNT(*) INTO v_applications FROM candidate_position_applications;
    SELECT COUNT(*) INTO v_rounds FROM interview_rounds;
    SELECT COUNT(*) INTO v_interviewers FROM interviewers;
    SELECT COUNT(*) INTO v_schedules FROM interview_schedules;
    SELECT COUNT(*) INTO v_results FROM interview_results;
    SELECT COUNT(*) INTO v_offers FROM offers;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'INTERVIEW DATABASE CREATED SUCCESSFULLY!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Departments: %', v_departments;
    RAISE NOTICE 'Employees: %', v_employees;
    RAISE NOTICE 'Positions: %', v_positions;
    RAISE NOTICE 'Candidates: %', v_candidates;
    RAISE NOTICE 'Applications: %', v_applications;
    RAISE NOTICE 'Interview Rounds: %', v_rounds;
    RAISE NOTICE 'Interviewers: %', v_interviewers;
    RAISE NOTICE 'Interview Schedules: % (completed + upcoming)', v_schedules;
    RAISE NOTICE 'Interview Results: %', v_results;
    RAISE NOTICE 'Offers: % (2 accepted)', v_offers;
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'DATABASE READY FOR TESTING!';
    RAISE NOTICE 'Connection URL: postgresql://postgres@localhost:5432/interview_db';
    RAISE NOTICE '============================================================================';
END $$;
