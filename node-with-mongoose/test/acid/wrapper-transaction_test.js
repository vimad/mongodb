import { Account, Transaction, WrapperTransactionExample } from '../../src/acid/index.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Wrapper Transaction Management', () => {
    
    beforeEach(async () => {
        // Clean up collections
        await Account.deleteMany({});
        await Transaction.deleteMany({});
        
        // Create test accounts
        await Account.create([
            { accountNumber: 'ACC001', balance: 1000 },
            { accountNumber: 'ACC002', balance: 500 }
        ]);
    });

    describe('Successful Transactions', () => {
        it('should transfer money successfully using withTransaction wrapper', async () => {
            const result = await WrapperTransactionExample.transferMoney('ACC001', 'ACC002', 200);
            
            expect(result.success).to.be.true;
            expect(result.fromAccount).to.equal(800); // 1000 - 200
            expect(result.toAccount).to.equal(700);   // 500 + 200
            
            // Verify accounts were updated
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            
            expect(fromAccount.balance).to.equal(800);
            expect(toAccount.balance).to.equal(700);
            
            // Verify transaction record was created
            const transaction = await Transaction.findOne({ fromAccount: 'ACC001' });
            expect(transaction).to.not.be.null;
            expect(transaction.amount).to.equal(200);
            expect(transaction.status).to.equal('completed');
        });

        it('should handle multiple operations in single transaction', async () => {
            // Create additional account
            await Account.create({ accountNumber: 'ACC003', balance: 300 });
            
            const result = await WrapperTransactionExample.transferMoney('ACC001', 'ACC002', 100);
            
            // Verify all accounts are consistent
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(900); // ACC001: 1000 - 100
            expect(accounts[1].balance).to.equal(600); // ACC002: 500 + 100
            expect(accounts[2].balance).to.equal(300); // ACC003: unchanged
        });
    });

    describe('Failed Transactions and Auto-Rollback', () => {
        it('should auto-rollback transaction when error occurs', async () => {
            try {
                await WrapperTransactionExample.transferMoneyWithError('ACC001', 'ACC002', 200);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Simulated error during transfer');
            }
            
            // Verify accounts were NOT updated (auto-rollback worked)
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            
            expect(fromAccount.balance).to.equal(1000); // Original balance
            expect(toAccount.balance).to.equal(500);    // Original balance
            
            // Verify no transaction record was created
            const transaction = await Transaction.findOne({ fromAccount: 'ACC001' });
            expect(transaction).to.be.null;
        });

        it('should auto-rollback when insufficient funds', async () => {
            try {
                await WrapperTransactionExample.transferMoney('ACC001', 'ACC002', 1500);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Insufficient funds');
            }
            
            // Verify accounts were NOT updated
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            
            expect(fromAccount.balance).to.equal(1000);
            expect(toAccount.balance).to.equal(500);
        });

        it('should auto-rollback when from account not found', async () => {
            try {
                await WrapperTransactionExample.transferMoney('INVALID', 'ACC002', 200);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('From account not found');
            }
            
            // Verify accounts were NOT updated
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            expect(toAccount.balance).to.equal(500);
        });

        it('should auto-rollback when to account not found', async () => {
            try {
                await WrapperTransactionExample.transferMoney('ACC001', 'INVALID', 200);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('To account not found');
            }
            
            // Verify from account was NOT updated
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            expect(fromAccount.balance).to.equal(1000);
        });
    });

    describe('Concurrent Transactions', () => {
        it('should handle concurrent transfers correctly', async () => {
            // Create additional account
            await Account.create({ accountNumber: 'ACC003', balance: 200 });
            
            // Start two concurrent transfers
            const transfer1 = WrapperTransactionExample.transferMoney('ACC001', 'ACC002', 100);
            const transfer2 = WrapperTransactionExample.transferMoney('ACC001', 'ACC003', 150);
            
            // Wait for both to complete
            const [result1, result2] = await Promise.all([transfer1, transfer2]);
            
            expect(result1.success).to.be.true;
            expect(result2.success).to.be.true;
            
            // Verify final balances
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(750); // ACC001: 1000 - 100 - 150
            expect(accounts[1].balance).to.equal(600); // ACC002: 500 + 100
            expect(accounts[2].balance).to.equal(350); // ACC003: 200 + 150
        });
    });

    describe('Transaction Isolation', () => {
        it('should maintain isolation between transactions', async () => {
            // Create additional account
            await Account.create({ accountNumber: 'ACC003', balance: 100 });
            
            // Start a slow transaction and a fast one
            const slowTransfer = new Promise(async (resolve, reject) => {
                try {
                    // Simulate slow operation
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const result = await WrapperTransactionExample.transferMoney('ACC001', 'ACC002', 200);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            
            const fastTransfer = WrapperTransactionExample.transferMoney('ACC001', 'ACC003', 100);
            
            // Wait for both to complete
            const [result1, result2] = await Promise.all([slowTransfer, fastTransfer]);
            
            expect(result1.success).to.be.true;
            expect(result2.success).to.be.true;
            
            // Verify final balances
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(700); // ACC001: 1000 - 200 - 100
            expect(accounts[1].balance).to.equal(700); // ACC002: 500 + 200
            expect(accounts[2].balance).to.equal(200); // ACC003: 100 + 100
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await Account.deleteMany({});
        await Transaction.deleteMany({});
    });
});
