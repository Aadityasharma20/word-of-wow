import { supabaseAdmin } from '../lib/supabase';

// ── Helpers ────────────────────────────────────────────────

function average(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function standardDeviation(nums: number[]): number {
    if (nums.length < 2) return 0;
    const avg = average(nums);
    const squareDiffs = nums.map((n) => Math.pow(n - avg, 2));
    return Math.sqrt(average(squareDiffs));
}

// ── Trust Score Calculator ─────────────────────────────────

export async function calculateTrustScore(advocateId: string): Promise<number> {
    // 1. Fetch ALL approved submissions for this advocate
    const { data: submissions } = await supabaseAdmin
        .from('submissions')
        .select('score_authenticity, score_final')
        .eq('advocate_id', advocateId)
        .eq('review_status', 'approved')
        .order('created_at', { ascending: true });

    if (!submissions || submissions.length === 0) {
        return 50.00; // Default starting score
    }

    // 2. avg_authenticity (40% weight)
    const authenticityScores = submissions
        .map((s) => s.score_authenticity)
        .filter((s): s is number => s !== null);
    const avgAuthenticity = authenticityScores.length > 0 ? average(authenticityScores) : 50;

    // 3. fraud_penalty (20% weight)
    const { data: advocateProfile } = await supabaseAdmin
        .from('advocate_profiles')
        .select('fraud_flags')
        .eq('id', advocateId)
        .single();

    const fraudFlags = advocateProfile?.fraud_flags || 0;
    const fraudPenalty = Math.min(fraudFlags * 15, 100); // Each flag costs 15 points, max 100
    const fraudScore = 100 - fraudPenalty;

    // 4. engagement_consistency (20% weight)
    const finalScores = submissions
        .map((s) => s.score_final)
        .filter((s): s is number => s !== null);
    const stdDev = standardDeviation(finalScores);
    const consistencyScore = Math.max(0, 100 - stdDev * 2); // Lower stddev = higher score

    // 5. volume_factor (10% weight)
    const volumeScore = Math.min((submissions.length / 20) * 100, 100); // Caps at 20 submissions

    // 6. recent_trend (10% weight)
    const recentSubmissions = submissions.slice(-5);
    const recentFinalScores = recentSubmissions
        .map((s) => s.score_final)
        .filter((s): s is number => s !== null);
    const recentAvg = recentFinalScores.length > 0 ? average(recentFinalScores) : 0;
    const overallAvg = finalScores.length > 0 ? average(finalScores) : 0;
    const trendBonus = recentAvg > overallAvg
        ? Math.min((recentAvg - overallAvg) * 2, 100)
        : 0;

    // 7. Weighted composite
    const trustScore =
        avgAuthenticity * 0.40 +
        fraudScore * 0.20 +
        consistencyScore * 0.20 +
        volumeScore * 0.10 +
        trendBonus * 0.10;

    return Math.round(trustScore * 100) / 100; // 2 decimal places
}
