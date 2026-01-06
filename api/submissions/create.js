const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        await client.connect();
        const database = client.db('qaran-exchange');
        const submissions = database.collection('submissions');

        const {
            customerName,
            customerPhone,
            customerEmail,
            usdtWallet,
            evcPlusNumber,
            xbetId,
            melbetId,
            moneygoWallet,
            edahapNumber,
            premierWallet,
            zaadNumber,
            notes
        } = req.body;

        // Validate required fields
        if (!customerName || !customerEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer name and email are required' 
            });
        }

        // Check that at least one account is provided
        const hasAccount = usdtWallet || evcPlusNumber || xbetId || melbetId || 
                          moneygoWallet || edahapNumber || premierWallet || zaadNumber;

        if (!hasAccount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide at least one account detail' 
            });
        }

        // Generate unique submission ID
        const submissionId = 'SUB' + Date.now() + Math.floor(Math.random() * 1000);

        // Create submission document
        const submissionDoc = {
            submission_id: submissionId,
            customer_name: customerName,
            customer_phone: customerPhone || '',
            customer_email: customerEmail,
            accounts: {
                usdt_wallet: usdtWallet || '',
                evc_plus: evcPlusNumber || '',
                zaad: zaadNumber || '',
                premier_wallet: premierWallet || '',
                xbet_id: xbetId || '',
                melbet_id: melbetId || '',
                moneygo_wallet: moneygoWallet || '',
                edahap: edahapNumber || ''
            },
            notes: notes || '',
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
        };

        // Insert submission into database
        const result = await submissions.insertOne(submissionDoc);

        res.status(200).json({
            success: true,
            submissionId: result.insertedId.toString(),
            message: 'Submission received successfully'
        });

    } catch (error) {
        console.error('Submission creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process submission'
        });
    } finally {
        await client.close();
    }
};
