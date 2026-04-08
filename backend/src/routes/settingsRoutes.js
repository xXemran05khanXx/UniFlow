const express = require('express');
const fs = require('fs');
const path = require('path');

const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const SETTINGS_DIR = path.join(__dirname, '..', '..', 'data');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const defaultSettings = {
    application: {
        collegeName: 'A.P Shah Institute of Technology',
        collegeLogo: '',
        enableEmailNotifications: true,
        enableSMSNotifications: false,
        maintenanceMode: false,
        maintenanceMessage: 'System is under maintenance. Please check back later.'
    },
    backup: {
        autoBackupEnabled: true,
        backupFrequency: 'weekly',
        retentionDays: 30,
        lastBackupDate: null
    },
    updatedAt: null,
    updatedBy: null
};

function ensureSettingsFile() {
    if (!fs.existsSync(SETTINGS_DIR)) {
        fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }

    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf8');
    }
}

function readSettings() {
    ensureSettingsFile();

    try {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        const parsed = JSON.parse(raw);

        return {
            ...defaultSettings,
            ...parsed,
            application: {
                ...defaultSettings.application,
                ...(parsed.application || {})
            },
            backup: {
                ...defaultSettings.backup,
                ...(parsed.backup || {})
            }
        };
    } catch (error) {
        return { ...defaultSettings };
    }
}

function writeSettings(settings) {
    ensureSettingsFile();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

router.use(auth);
router.use(authorize('admin'));

router.get('/', (req, res) => {
    const settings = readSettings();
    res.status(200).json({
        success: true,
        data: settings
    });
});

router.put('/', (req, res) => {
    const current = readSettings();
    const incoming = req.body || {};

    const updated = {
        ...current,
        application: {
            ...current.application,
            ...(incoming.application || {})
        },
        backup: {
            ...current.backup,
            ...(incoming.backup || {})
        },
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?._id || null
    };

    writeSettings(updated);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: updated
    });
});

router.post('/backup', (req, res) => {
    const current = readSettings();
    const now = new Date().toISOString().split('T')[0];

    const updated = {
        ...current,
        backup: {
            ...current.backup,
            lastBackupDate: now
        },
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?._id || null
    };

    writeSettings(updated);

    res.status(200).json({
        success: true,
        message: 'Backup metadata updated',
        data: {
            lastBackupDate: now
        }
    });
});

module.exports = router;
