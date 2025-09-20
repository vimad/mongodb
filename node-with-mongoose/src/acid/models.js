import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// ============================================================================
// SIMPLE MODELS FOR ACID TRANSACTION DEMONSTRATION
// ============================================================================

/**
 * Account Model - Simple bank account
 */
const AccountSchema = new Schema({
    accountNumber: String,
    balance: Number
});

/**
 * Transaction Model - Simple transaction record
 */
const TransactionSchema = new Schema({
    fromAccount: String,
    toAccount: String,
    amount: Number,
    status: String
});

// ============================================================================
// EXPORT MODELS
// ============================================================================

export const Account = mongoose.model('Account', AccountSchema);
export const Transaction = mongoose.model('Transaction', TransactionSchema);
