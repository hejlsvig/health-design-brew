const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'keto_calculator.db');

class AuthService {
    constructor() {
        this.db = new sqlite3.Database(dbPath);
    }

    /**
     * Create a new user
     */
    async createUser(email, password, name, role = 'coach', workEmail = null, language = 'da') {
        return new Promise(async (resolve, reject) => {
            try {
                // Hash password
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                this.db.run(
                    `INSERT INTO users (email, password_hash, name, role, work_email, language, active)
                     VALUES (?, ?, ?, ?, ?, ?, 1)`,
                    [email, passwordHash, name, role, workEmail, language],
                    function(err) {
                        if (err) {
                            if (err.message.includes('UNIQUE constraint failed')) {
                                reject(new Error('Email already exists'));
                            } else {
                                reject(err);
                            }
                        } else {
                            resolve({ id: this.lastID, email, name, role });
                        }
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Authenticate user with email and password
     */
    async login(email, password) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE email = ? AND active = 1',
                [email],
                async (err, user) => {
                    if (err) {
                        reject(err);
                    } else if (!user) {
                        reject(new Error('Invalid email or password'));
                    } else {
                        try {
                            const match = await bcrypt.compare(password, user.password_hash);
                            if (match) {
                                // Don't send password hash to frontend
                                delete user.password_hash;
                                resolve(user);
                            } else {
                                reject(new Error('Invalid email or password'));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    }
                }
            );
        });
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, email, name, role, work_email, language, email_footer, email_logo, active, created_at FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err) reject(err);
                    else resolve(user);
                }
            );
        });
    }

    /**
     * Get all users
     */
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, email, name, role, work_email, language, email_footer, email_logo, active, created_at FROM users ORDER BY created_at DESC',
                [],
                (err, users) => {
                    if (err) reject(err);
                    else resolve(users);
                }
            );
        });
    }

    /**
     * Update user
     */
    async updateUser(userId, updates) {
        return new Promise(async (resolve, reject) => {
            try {
                // Map camelCase to snake_case
                if (updates.workEmail !== undefined) {
                    updates.work_email = updates.workEmail;
                    delete updates.workEmail;
                }
                if (updates.emailFooter !== undefined) {
                    updates.email_footer = updates.emailFooter;
                    delete updates.emailFooter;
                }
                if (updates.emailLogo !== undefined) {
                    updates.email_logo = updates.emailLogo;
                    delete updates.emailLogo;
                }

                const allowedFields = ['name', 'work_email', 'language', 'email_footer', 'email_logo', 'role', 'active'];
                const updateFields = [];
                const values = [];

                // If password is being updated, hash it
                if (updates.password) {
                    const saltRounds = 10;
                    const passwordHash = await bcrypt.hash(updates.password, saltRounds);
                    updateFields.push('password_hash = ?');
                    values.push(passwordHash);
                }

                // Add other fields
                for (const field of allowedFields) {
                    if (updates[field] !== undefined) {
                        updateFields.push(`${field} = ?`);
                        values.push(updates[field]);
                    }
                }

                if (updateFields.length === 0) {
                    return reject(new Error('No valid fields to update'));
                }

                values.push(userId);

                this.db.run(
                    `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    values,
                    function(err) {
                        if (err) reject(err);
                        else resolve({ updated: this.changes });
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Delete user (soft delete by setting active = 0)
     */
    async deleteUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ deleted: this.changes });
                }
            );
        });
    }

    /**
     * Assign lead to user
     */
    async assignLead(leadId, userId, assignedBy) {
        return new Promise((resolve, reject) => {
            // First check if lead is already assigned
            this.db.get(
                'SELECT * FROM lead_assignments WHERE lead_id = ?',
                [leadId],
                (err, existing) => {
                    if (err) {
                        reject(err);
                    } else if (existing) {
                        // Update existing assignment
                        this.db.run(
                            'UPDATE lead_assignments SET user_id = ?, assigned_by = ?, assigned_at = CURRENT_TIMESTAMP WHERE lead_id = ?',
                            [userId, assignedBy, leadId],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ id: existing.id, leadId, userId });
                            }
                        );
                    } else {
                        // Create new assignment
                        this.db.run(
                            'INSERT INTO lead_assignments (lead_id, user_id, assigned_by) VALUES (?, ?, ?)',
                            [leadId, userId, assignedBy],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ id: this.lastID, leadId, userId });
                            }
                        );
                    }
                }
            );
        });
    }

    /**
     * Get leads assigned to a user
     */
    async getAssignedLeads(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT l.*, la.assigned_at, u.name as assigned_by_name
                 FROM leads l
                 JOIN lead_assignments la ON l.id = la.lead_id
                 LEFT JOIN users u ON la.assigned_by = u.id
                 WHERE la.user_id = ?
                 ORDER BY la.assigned_at DESC`,
                [userId],
                (err, leads) => {
                    if (err) reject(err);
                    else resolve(leads);
                }
            );
        });
    }

    /**
     * Get unassigned leads
     */
    async getUnassignedLeads() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT l.*
                 FROM leads l
                 LEFT JOIN lead_assignments la ON l.id = la.lead_id
                 WHERE la.id IS NULL
                 ORDER BY l.created_at DESC`,
                [],
                (err, leads) => {
                    if (err) reject(err);
                    else resolve(leads);
                }
            );
        });
    }

    /**
     * Get user assigned to a lead
     */
    async getLeadAssignment(leadId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT la.*, u.name as user_name, u.email as user_email, u.work_email
                 FROM lead_assignments la
                 JOIN users u ON la.user_id = u.id
                 WHERE la.lead_id = ?`,
                [leadId],
                (err, assignment) => {
                    if (err) reject(err);
                    else resolve(assignment);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = AuthService;
