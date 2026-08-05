const db = require('../config/db');

// Rule-Based Smart Priority Helper (Fallback calculation)
const calculateSmartPriority = (category, title, description) => {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    const cat = (category || '').toLowerCase();

    if (text.includes('electrical') || text.includes('fire') || text.includes('spark') || text.includes('exposed wire')) {
        return 'CRITICAL';
    }
    if (cat.includes('water') || text.includes('leak') || text.includes('flooding') || text.includes('pipe') || text.includes('wifi') || text.includes('internet')) {
        return 'HIGH';
    }
    if (cat.includes('classroom') || cat.includes('sanitation') || text.includes('light') || text.includes('toilet') || text.includes('projector')) {
        return 'MEDIUM';
    }
    if (cat.includes('furniture') || text.includes('chair') || text.includes('desk') || text.includes('table')) {
        return 'LOW';
    }

    return 'MEDIUM'; // Default baseline
};

// 1. Create a New Problem Report (CREATE)
const createReport = async (req, res) => {
    const { title, description, category, location, priority, image_url } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category || !location) {
        return res.status(400).json({
            status: 'ERROR',
            message: 'Title, description, category, and location are required.'
        });
    }

    const finalPriority = priority || calculateSmartPriority(category, title, description);

    try {
        const queryText = `
            INSERT INTO reports (user_id, title, description, category, location, priority, status, image_url)
            VALUES ($1, $2, $3, $4, $5, $6::report_priority, 'PENDING', $7)
            RETURNING *
        `;
        const values = [
            userId, 
            title.trim(), 
            description.trim(), 
            category.trim(), 
            location.trim(), 
            finalPriority, 
            image_url || null
        ];
        
        const result = await db.query(queryText, values);

        res.status(201).json({
            status: 'SUCCESS',
            message: 'Problem report submitted successfully.',
            report: result.rows[0]
        });
    } catch (err) {
        console.error('[CREATE REPORT ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to submit problem report.' });
    }
};

// 2. Get All Reports Submitted by Logged-in Student (READ)
const getMyReports = async (req, res) => {
    const userId = req.user.id;

    try {
        const queryText = `
            SELECT id, title, description, category, location, priority, status, image_url, admin_note, created_at, updated_at
            FROM reports
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await db.query(queryText, [userId]);

        res.status(200).json({
            status: 'SUCCESS',
            count: result.rows.length,
            reports: result.rows
        });
    } catch (err) {
        console.error('[GET MY REPORTS ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to retrieve reports.' });
    }
};

// 3. Get Single Report by ID (READ)
const getReportById = async (req, res) => {
    const reportId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const queryText = `
            SELECT r.*, u.name as user_name, u.email as user_email 
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = $1
        `;
        const result = await db.query(queryText, [reportId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'Report not found.' });
        }

        const report = result.rows[0];

        // Access Control: Non-admins can only view their own reports
        if (report.user_id !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ status: 'ERROR', message: 'Access denied to this report.' });
        }

        res.status(200).json({
            status: 'SUCCESS',
            report
        });
    } catch (err) {
        console.error('[GET REPORT BY ID ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Error retrieving report details.' });
    }
};

// 4. Update Report (UPDATE)
const updateReport = async (req, res) => {
    const reportId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { title, description, category, location, priority, image_url } = req.body;

    try {
        const checkQuery = `SELECT * FROM reports WHERE id = $1`;
        const checkResult = await db.query(checkQuery, [reportId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'Report not found.' });
        }

        const existingReport = checkResult.rows[0];

        // Students can only update their own reports while PENDING. Admins bypass this.
        if (userRole !== 'ADMIN') {
            if (existingReport.user_id !== userId) {
                return res.status(403).json({ status: 'ERROR', message: 'Unauthorized to modify this report.' });
            }

            if (existingReport.status !== 'PENDING') {
                return res.status(400).json({ 
                    status: 'ERROR', 
                    message: 'Report cannot be modified once it is in progress or resolved.' 
                });
            }
        }

        const finalPriority = priority || calculateSmartPriority(
            category || existingReport.category, 
            title || existingReport.title, 
            description || existingReport.description
        );

        const updateQuery = `
            UPDATE reports
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                location = COALESCE($4, location),
                priority = $5::report_priority,
                image_url = COALESCE($6, image_url)
            WHERE id = $7
            RETURNING *
        `;
        const values = [title, description, category, location, finalPriority, image_url, reportId];
        const updatedResult = await db.query(updateQuery, values);

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Report updated successfully.',
            report: updatedResult.rows[0]
        });
    } catch (err) {
        console.error('[UPDATE REPORT ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to update report.' });
    }
};

// 5. Delete Report (DELETE - Fixed for Admin Access)
const deleteReport = async (req, res) => {
    const reportId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const checkResult = await db.query('SELECT * FROM reports WHERE id = $1', [reportId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'Report not found.' });
        }

        const report = checkResult.rows[0];

        // Authorization Check:
        // - Admins (role === 'ADMIN') can delete ANY report regardless of status or owner.
        // - Students can ONLY delete their OWN report if it is still 'PENDING'.
        if (userRole !== 'ADMIN') {
            if (report.user_id !== userId) {
                return res.status(403).json({ status: 'ERROR', message: 'Unauthorized to delete this report.' });
            }

            if (report.status !== 'PENDING') {
                return res.status(400).json({ 
                    status: 'ERROR', 
                    message: 'Cannot delete a report that is already under review or resolved.' 
                });
            }
        }

        await db.query('DELETE FROM reports WHERE id = $1', [reportId]);

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Report deleted successfully.'
        });
    } catch (err) {
        console.error('[DELETE REPORT ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Failed to delete report.' });
    }
};

module.exports = {
    createReport,
    getMyReports,
    getReportById,
    updateReport,
    deleteReport
};