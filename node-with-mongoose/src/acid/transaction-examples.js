import mongoose from 'mongoose';
import {Account, Transaction} from './models.js';
import util from "util";

// ============================================================================
// ACID TRANSACTION EXAMPLES - DIFFERENT APPROACHES
// ============================================================================

/**
 * APPROACH 1: Manual Transaction Management
 * Start, commit, and rollback transactions manually
 */
export class ManualTransactionExample {

    /**
     * Transfer money between accounts with manual transaction control
     */
    static async transferMoney(fromAccountNumber, toAccountNumber, amount, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const session = await mongoose.startSession();
            try {
                await session.startTransaction();

                const fromAccount = await Account.findOneAndUpdate(
                    {accountNumber: fromAccountNumber},
                    {$inc: {balance: -amount}},
                    {session, new: true}
                );

                if (!fromAccount) throw new Error('From account not found');
                if (fromAccount.balance < 0) throw new Error('Insufficient funds');

                const toAccount = await Account.findOneAndUpdate(
                    {accountNumber: toAccountNumber},
                    {$inc: {balance: amount}},
                    {session, new: true}
                );

                if (!toAccount) throw new Error('To account not found');

                await Transaction.create([{
                    fromAccount: fromAccountNumber,
                    toAccount: toAccountNumber,
                    amount,
                    status: 'completed'
                }], {session});

                await session.commitTransaction();

                return {
                    success: true,
                    fromAccount: fromAccount.balance,
                    toAccount: toAccount.balance
                };

            } catch (error) {
                console.log(util.inspect(error, {depth: null, colors: true}));
                await session.abortTransaction();
                // Retry only transient transaction errors
                if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) {
                    console.log(`Write conflict, retrying transaction (attempt ${attempt + 1})`);
                    continue;
                }
                throw error;
            } finally {
                await session.endSession();
            }
        }
        throw new Error('Transaction failed after maximum retries');
    }


    /**
     * Example that will fail and rollback
     */
    static async transferMoneyWithError(fromAccountNumber, toAccountNumber, amount) {
        const session = await mongoose.startSession();

        try {
            await session.startTransaction();

            // Update from account
            await Account.findOneAndUpdate(
                {accountNumber: fromAccountNumber},
                {$inc: {balance: -amount}},
                {session}
            );

            // Simulate an error
            throw new Error('Simulated error during transfer');

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }
}

/**
 * APPROACH 2: Using withTransaction Wrapper
 * Let the driver handle transaction lifecycle
 */
export class WrapperTransactionExample {

    /**
     * Transfer money using withTransaction wrapper
     */
    static async transferMoney(fromAccountNumber, toAccountNumber, amount) {
        return await mongoose.connection.transaction(async (session) => {
            // Find and update from account
            const fromAccount = await Account.findOneAndUpdate(
                {accountNumber: fromAccountNumber},
                {$inc: {balance: -amount}},
                {session, new: true}
            );

            if (!fromAccount) {
                throw new Error('From account not found');
            }

            if (fromAccount.balance < 0) {
                throw new Error('Insufficient funds');
            }

            // Find and update to account
            const toAccount = await Account.findOneAndUpdate(
                {accountNumber: toAccountNumber},
                {$inc: {balance: amount}},
                {session, new: true}
            );

            if (!toAccount) {
                throw new Error('To account not found');
            }

            // Create transaction record
            await Transaction.create([{
                fromAccount: fromAccountNumber,
                toAccount: toAccountNumber,
                amount: amount,
                status: 'completed'
            }], {session});

            return {
                success: true,
                fromAccount: fromAccount.balance,
                toAccount: toAccount.balance
            };
        });
    }

    /**
     * Example that will fail and auto-rollback
     */
    static async transferMoneyWithError(fromAccountNumber, toAccountNumber, amount) {
        return await mongoose.connection.transaction(async (session) => {
            // Update from account
            await Account.findOneAndUpdate(
                {accountNumber: fromAccountNumber},
                {$inc: {balance: -amount}},
                {session}
            );

            // Simulate an error - transaction will auto-rollback
            throw new Error('Simulated error during transfer');
        });
    }
}



/**
 * APPROACH 4: Bulk Operations with Transactions
 * Using bulkWrite with transactions
 */
export class BulkTransactionExample {

    /**
     * Transfer money using bulk operations
     */
    static async transferMoney(fromAccountNumber, toAccountNumber, amount, throwError = false, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const session = await mongoose.startSession();

            try {
                await session.startTransaction();

                // Prepare bulk operations
                const bulkOps = [
                    {
                        updateOne: {
                            filter: {accountNumber: fromAccountNumber},
                            update: {$inc: {balance: -amount}}
                        }
                    },
                    {
                        updateOne: {
                            filter: {accountNumber: toAccountNumber},
                            update: {$inc: {balance: amount}}
                        }
                    }
                ];

                // Execute bulk operations
                const result = await Account.bulkWrite(bulkOps, {session});

                // Create transaction record
                await Transaction.create([{
                    fromAccount: fromAccountNumber,
                    toAccount: toAccountNumber,
                    amount: amount,
                    status: 'completed'
                }], {session});

                if (throwError) throw new Error('Simulated error during transfer');

                await session.commitTransaction();

                return {
                    success: true,
                    modifiedCount: result.modifiedCount
                };

            } catch (error) {
                await session.abortTransaction();
                // Retry only transient transaction errors
                if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) {
                    console.log(`Write conflict, retrying transaction (attempt ${attempt + 1})`);
                    continue;
                }
                throw error;
            } finally {
                await session.endSession();
            }
        }
        throw new Error('Transaction failed after maximum retries');
    }
}

/**
 * APPROACH 5: Nested Transactions
 * Transactions within transactions
 */
export class NestedTransactionExample {

    /**
     * Transfer money with nested transaction for logging
     */
    static async transferMoneyWithLogging(fromAccountNumber, toAccountNumber, amount, throwError = false) {
        return await mongoose.connection.transaction(async (outerSession) => {
            // Main transfer logic
            const fromAccount = await Account.findOneAndUpdate(
                {accountNumber: fromAccountNumber},
                {$inc: {balance: -amount}},
                {session: outerSession, new: true}
            );

            const toAccount = await Account.findOneAndUpdate(
                {accountNumber: toAccountNumber},
                {$inc: {balance: amount}},
                {session: outerSession, new: true}
            );

            // Nested transaction for logging (will be part of outer transaction)
            await mongoose.connection.transaction(async (innerSession) => {
                await Transaction.create([{
                    fromAccount: fromAccountNumber,
                    toAccount: toAccountNumber,
                    amount: amount,
                    status: 'completed'
                }], {session: innerSession});
                if (throwError) throw new Error('Simulated error during transfer');
            });

            return {
                success: true,
                fromAccount: fromAccount.balance,
                toAccount: toAccount.balance
            };
        });
    }
}
