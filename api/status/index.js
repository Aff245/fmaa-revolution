// api/status/index.js (Versi Enterprise dengan Vercel KV)
import { kv } from '@vercel/kv';

const STATUS_KEY = 'fmaa-enterprise-status';

async function getInitialStatus() {
    let status = await kv.get(STATUS_KEY);
    if (!status) {
        status = {
            last_updated: null,
            // Mencerminkan data_sources dari belief_manager.py
            system_state: {
                vercel_metrics: { status: 'unknown' },
                supabase_health: { status: 'unknown' },
                github_actions: { status: 'unknown' },
                termux_status: { status: 'unknown' },
                agent_performance: { status: 'unknown' }
            }
        };
        await kv.set(STATUS_KEY, status);
    }
    return status;
}

export default async function handler(req, res) {
    // Izinkan koneksi dari mana saja (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { return res.status(200).end(); }

    if (req.method === 'POST') {
        try {
            const { source, data } = req.body;
            let currentStatus = await getInitialStatus();
            if (source && currentStatus.system_state[source]) {
                currentStatus.system_state[source] = data;
                currentStatus.last_updated = new Date().toISOString();
                await kv.set(STATUS_KEY, currentStatus);
                return res.status(200).json({ message: `Belief for ${source} updated.` });
            }
            return res.status(400).json({ error: 'Invalid source.' });
        } catch (e) {
            return res.status(500).json({ error: 'KV write error', details: e.message });
        }
    } 
    
    if (req.method === 'GET') {
        try {
            let currentStatus = await getInitialStatus();
            res.setHeader('Cache-Control', 'no-store');
            return res.status(200).json(currentStatus);
        } catch (e) {
            return res.status(500).json({ error: 'KV read error', details: e.message });
        }
    }
    
    return res.status(405).json({ error: 'Method Not Allowed' });
}
