alter table awenture_private.question_topup_requests drop constraint question_topup_requests_status_check;
alter table awenture_private.question_topup_requests add constraint question_topup_requests_status_check check (status = any (array['queued','generating','review','expert_review','approved','released','review_failed','rejected','cancelled','complete','failed']));
alter table awenture_private.question_topup_batches drop constraint question_topup_batches_status_check;
alter table awenture_private.question_topup_batches add constraint question_topup_batches_status_check check (status = any (array['draft','generating','review','expert_review','approved','released','review_failed','rejected']));
