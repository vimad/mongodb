import { Account, Transaction, NestedTransactionExample } from '../../src/acid/index.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Nested Transaction Management', () => {
    
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

    describe('Successful Nested Transactions', () => {
        it('should transfer money successfully with nested transaction for logging', async () => {
            const result = await NestedTransactionExample.transferMoneyWithLogging('ACC001', 'ACC002', 200);
            
            expect(result.success).to.be.true;
            expect(result.fromAccount).to.equal(800); // 1000 - 200
            expect(result.toAccount).to.equal(700);   // 500 + 200
            
            // Verify accounts were updated
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            
            expect(fromAccount.balance).to.equal(800);
            expect(toAccount.balance).to.equal(700);
            
            // Verify transaction record was created (from nested transaction)
            const transaction = await Transaction.findOne({ fromAccount: 'ACC001' });
            expect(transaction).to.not.be.null;
            expect(transaction.amount).to.equal(200);
            expect(transaction.status).to.equal('completed');
        });

        it('should handle multiple operations with nested transactions', async () => {
            // Create additional account
            await Account.create({ accountNumber: 'ACC003', balance: 300 });
            
            const result = await NestedTransactionExample.transferMoneyWithLogging('ACC001', 'ACC002', 100);
            
            // Verify all accounts are consistent
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(900); // ACC001: 1000 - 100
            expect(accounts[1].balance).to.equal(600); // ACC002: 500 + 100
            expect(accounts[2].balance).to.equal(300); // ACC003: unchanged
        });
    });

    describe('Failed Nested Transactions and Rollback', () => {
        it('should rollback both outer and inner transactions when error occurs', async () => {
            // We'll simulate an error by trying to transfer more than available
            try {
                await NestedTransactionExample.transferMoneyWithLogging('ACC001', 'ACC002', 1500, true);
                expect.fail('Should have thrown an error');
            } catch (error) {
                // Error will be caught and both transactions rolled back
            }
            
            // Verify accounts were NOT updated (both transactions rolled back)
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            
            expect(fromAccount.balance).to.equal(1000); // Original balance
            expect(toAccount.balance).to.equal(500);    // Original balance
            
            // Verify no transaction record was created (nested transaction also rolled back)
            const transaction = await Transaction.findOne({ fromAccount: 'ACC001' });
            expect(transaction).to.be.null;
        });

        it('should rollback when from account not found', async () => {
            try {
                await NestedTransactionExample.transferMoneyWithLogging('INVALID', 'ACC002', 200);
                expect.fail('Should have thrown an error');
            } catch (error) {
                // Error will be caught and both transactions rolled back
            }
            
            // Verify accounts were NOT updated
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            expect(toAccount.balance).to.equal(500);
        });

        it('should rollback when to account not found', async () => {
            try {
                await NestedTransactionExample.transferMoneyWithLogging('ACC001', 'INVALID', 200);
                expect.fail('Should have thrown an error');
            } catch (error) {
                // Error will be caught and both transactions rolled back
            }
            
            // Verify from account was NOT updated
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            expect(fromAccount.balance).to.equal(1000);
        });
    });

    describe('Nested Transaction Consistency', () => {
        it('should maintain consistency across nested transactions', async () => {
            // Create additional accounts
            await Account.create([
                { accountNumber: 'ACC003', balance: 100 },
                { accountNumber: 'ACC004', balance: 200 }
            ]);
            
            // Perform multiple transfers with nested logging
            const transfer1 = NestedTransactionExample.transferMoneyWithLogging('ACC001', 'ACC002', 100);
            const transfer2 = NestedTransactionExample.transferMoneyWithLogging('ACC002', 'ACC003', 50);
            const transfer3 = NestedTransactionExample.transferMoneyWithLogging('ACC003', 'ACC004', 25);
            
            // Wait for all to complete
            const [result1, result2, result3] = await Promise.all([transfer1, transfer2, transfer3]);
            
            expect(result1.success).to.be.true;
            expect(result2.success).to.be.true;
            expect(result3.success).to.be.true;
            
            // Verify all accounts are consistent
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(900); // ACC001: 1000 - 100
            expect(accounts[1].balance).to.equal(550); // ACC002: 500 + 100 - 50
            expect(accounts[2].balance).to.equal(125); // ACC003: 100 + 50 - 25
            expect(accounts[3].balance).to.equal(225); // ACC004: 200 + 25
            
            // Verify all transaction records were created (from nested transactions)
            const transactions = await Transaction.find({}).sort({ createdAt: 1 });
            expect(transactions).to.have.length(3);
            expect(transactions.filter(tr => tr.fromAccount === 'ACC001')[0].amount).to.equal(100);
            expect(transactions.filter(tr => tr.fromAccount === 'ACC002')[0].amount).to.equal(50);
            expect(transactions.filter(tr => tr.fromAccount === 'ACC003')[0].amount).to.equal(25);
        });
    });

    describe('Nested Transaction Performance', () => {
        it('should handle concurrent nested transactions efficiently', async () => {
            // Create additional accounts
            await Account.create([
                { accountNumber: 'ACC003', balance: 100 },
                { accountNumber: 'ACC004', balance: 200 }
            ]);
            
            // Start multiple concurrent nested transactions
            const transfers = [
                NestedTransactionExample.transferMoneyWithLogging('ACC001', 'ACC002', 50),
                NestedTransactionExample.transferMoneyWithLogging('ACC001', 'ACC003', 75),
                NestedTransactionExample.transferMoneyWithLogging('ACC002', 'ACC004', 25),
                NestedTransactionExample.transferMoneyWithLogging('ACC003', 'ACC004', 10)
            ];
            
            // Wait for all to complete
            const results = await Promise.all(transfers);
            
            // All should succeed
            results.forEach(result => {
                expect(result.success).to.be.true;
            });
            
            // Verify final balances
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(875); // ACC001: 1000 - 50 - 75
            expect(accounts[1].balance).to.equal(525); // ACC002: 500 + 50 - 25
            expect(accounts[2].balance).to.equal(165);  // ACC003: 100 + 75 - 10
            expect(accounts[3].balance).to.equal(235); // ACC004: 200 + 25 + 10
            
            // Verify all transaction records were created
            const transactions = await Transaction.find({});
            expect(transactions).to.have.length(4);
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await Account.deleteMany({});
        await Transaction.deleteMany({});
    });
});
