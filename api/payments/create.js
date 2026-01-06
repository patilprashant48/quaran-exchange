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
        const payments = database.collection('payments');

        const {
            paymentMethod,
            amount,
            fee,
            totalAmount,
            exchangeType,
            senderAccount,
            receiverAccount,
            customerName,
            customerPhone,
            customerEmail,
            notes,
            transactionHash
        } = req.body;

        // Validate required fields
        if (!paymentMethod || !amount || !customerName || !customerEmail) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Generate unique transaction ID
        const transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);

        // Create payment document
        const paymentDoc = {
            transaction_id: transactionId,
            payment_method: paymentMethod,
            amount: parseFloat(amount),
            fee: parseFloat(fee),
            total_amount: parseFloat(totalAmount),
            exchange_type: exchangeType,
            sender_account: senderAccount,
            receiver_account: receiverAccount,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            notes: notes || '',
            transaction_hash: transactionHash || null,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
        };

        // Insert payment into database
        const result = await payments.insertOne(paymentDoc);

        res.status(200).json({
            success: true,
            paymentId: result.insertedId.toString(),
            transactionId: transactionId,
            message: 'Payment submitted successfully'
        });

    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process payment'
        });
    } finally {
        await client.close();
    }
};
