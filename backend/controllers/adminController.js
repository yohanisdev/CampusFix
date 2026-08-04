const db = require('../config/db');

// 1. Get All Campus Reports (Supports filtering by status and priority)
const getAllReports = async (req, res) => {
    const { status, priority } = req.query;

    try {
        let queryText = `
            SELECT r.id, r.title, r.description, r.category, r.location, 
                   r.priority, r.status, r.image_url, r.admin_note, 
                   r.created_at, r.updated_at,
                   u.name AS reporter_name, u.email AS reporter_email
            FROM reports r
            JOIN users u ON r.user_id = u.id
        `;
        
        const queryParams = [];
        const conditions = [];

        if (status) {
            queryParams.push(status.toUpperCase());
            conditions.push(`r.status = $${queryParams.length}`);
        }

        if (priority) {
            queryParams.push(priority.toUpperCase());
            conditions.push(`r.priority = $${queryParams.length}`);
        }

        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }

        queryText += ' ORDER BY r.created_at DESC';

        const result = await db.query(queryText, queryParams);

        res.status(200).json({
            status: 'SUCCESS',
            count: result.rows.length,
            reports: result.rows
        });
    } catch (err) {
        console.error('[ADMIN GET ALL REPORTS ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to retrieve campus reports.' });
    }
};

// 2. Update Report Status & Priority
const updateReportStatus = async (req, res) => {
    const reportId = req.params.id;
    const { status, priority, admin_note } = req.body;

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (status && !validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({ status: 'ERROR', message: 'Invalid status value provided.' });
    }

    if (priority && !validPriorities.includes(priority.toUpperCase())) {
        return res.status(400).json({ status: 'ERROR', message: 'Invalid priority value provided.' });
    }

    try {
        const queryText = `
            UPDATE reports
            SET status = COALESCE($1, status),
                priority = COALESCE($2, priority),
                admin_note = COALESCE($3, admin_note),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        const values = [
            status ? status.toUpperCase() : null, 
            priority ? priority.toUpperCase() : null, 
            admin_note || null, 
            reportId
        ];

        const result = await db.query(queryText, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'Report not found.' });
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Report status updated successfully.',
            report: result.rows[0]
        });
    } catch (err) {
        console.error('[ADMIN UPDATE STATUS ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to update report status.' });
    }
};

// 3. Add Internal Admin Notes
const addAdminNote = async (req, res) => {
    const reportId = req.params.id;
    const { admin_note } = req.body;

    if (!admin_note) {
        return res.status(400).json({ status: 'ERROR', message: 'Admin note content is required.' });
    }

    try {
        const queryText = `
            UPDATE reports
            SET admin_note = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(queryText, [admin_note.trim(), reportId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'Report not found.' });
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Admin note attached successfully.',
            report: result.rows[0]
        });
    } catch (err) {
        console.error('[ADMIN ADD NOTE ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to add admin note.' });
    }
};

// 4. Get Dashboard Metrics & Analytics
const getDashboardStats = async (req, res) => {
    try {
        const totalQuery = `SELECT COUNT(*) AS total FROM reports`;
        const statusQuery = `
            SELECT status, COUNT(*) AS count 
            FROM reports 
            GROUP BY status
        `;
        const priorityQuery = `
            SELECT priority, COUNT(*) AS count 
            FROM reports 
            GROUP BY priority
        `;

        const [totalRes, statusRes, priorityRes] = await Promise.all([
            db.query(totalQuery),
            db.query(statusQuery),
            db.query(priorityQuery)
        ]);

        const statusCounts = { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
        statusRes.rows.forEach(row => {
            statusCounts[row.status] = parseInt(row.count, 10);
        });

        const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
        priorityRes.rows.forEach(row => {
            priorityCounts[row.priority] = parseInt(row.count, 10);
        });

        res.status(200).json({
            status: 'SUCCESS',
            stats: {
                total_reports: parseInt(totalRes.rows[0].total, 10),
                by_status: statusCounts,
                by_priority: priorityCounts
            }
        });
    } catch (err) {
        console.error('[ADMIN DASHBOARD STATS ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to fetch dashboard statistics.' });
    }
};

module.exports = {
    getAllReports,
    updateReportStatus,
    addAdminNote,
    getDashboardStats
};