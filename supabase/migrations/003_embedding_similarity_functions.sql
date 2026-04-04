-- ============================================================
-- Embedding Similarity Functions for Fraud Detection
-- Used by Agent 2 (Sentinel) to detect duplicate/coordinated content
-- ============================================================

-- Match embeddings from the SAME advocate (duplicate content check)
-- Returns submissions with cosine similarity > threshold
CREATE OR REPLACE FUNCTION match_embeddings_same_user(
    query_embedding vector(1536),
    match_advocate_id UUID,
    exclude_submission_id UUID,
    similarity_threshold FLOAT DEFAULT 0.92
)
RETURNS TABLE (
    submission_id UUID,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.submission_id,
        (1 - (se.embedding <=> query_embedding))::FLOAT AS similarity
    FROM submission_embeddings se
    WHERE se.advocate_id = match_advocate_id
      AND se.submission_id != exclude_submission_id
      AND (1 - (se.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT 5;
END;
$$;

-- Match embeddings from OTHER advocates in the same campaign (coordinated content check)
-- Returns submissions with cosine similarity > threshold
CREATE OR REPLACE FUNCTION match_embeddings_cross_user(
    query_embedding vector(1536),
    exclude_advocate_id UUID,
    match_campaign_id UUID,
    exclude_submission_id UUID,
    similarity_threshold FLOAT DEFAULT 0.88
)
RETURNS TABLE (
    submission_id UUID,
    advocate_id UUID,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.submission_id,
        se.advocate_id,
        (1 - (se.embedding <=> query_embedding))::FLOAT AS similarity
    FROM submission_embeddings se
    INNER JOIN submissions s ON s.id = se.submission_id
    WHERE se.advocate_id != exclude_advocate_id
      AND s.campaign_id = match_campaign_id
      AND se.submission_id != exclude_submission_id
      AND (1 - (se.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT 5;
END;
$$;
