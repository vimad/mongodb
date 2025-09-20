import { Account, Transaction, BulkTransactionExample } from '../../src/acid/index.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Bulk Transaction Management', () => {
    
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

    describe('Successful Bulk Operations', () => {
        it('should transfer money successfully using bulk operations', async () => {
            const result = await BulkTransactionExample.transferMoney('ACC001', 'ACC002', 200);
            
            expect(result.success).to.be.true;
            expect(result.modifiedCount).to.equal(2); // Both accounts modified
            
            // Verify accounts were updated
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            
            expect(fromAccount.balance).to.equal(800); // 1000 - 200
            expect(toAccount.balance).to.equal(700);   // 500 + 200
            
            // Verify transaction record was created
            const transaction = await Transaction.findOne({ fromAccount: 'ACC001' });
            expect(transaction).to.not.be.null;
            expect(transaction.amount).to.equal(200);
            expect(transaction.status).to.equal('completed');
        });

        it('should handle multiple bulk operations in single transaction', async () => {
            // Create additional account
            await Account.create({ accountNumber: 'ACC003', balance: 300 });
            
            const result = await BulkTransactionExample.transferMoney('ACC001', 'ACC002', 100);
            
            // Verify all accounts are consistent
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(900); // ACC001: 1000 - 100
            expect(accounts[1].balance).to.equal(600); // ACC002: 500 + 100
            expect(accounts[2].balance).to.equal(300); // ACC003: unchanged
        });
    });

    describe('Failed Bulk Operations and Rollback', () => {
        it('should rollback bulk operations when error occurs', async () => {
            try {
                // This will fail because we're trying to transfer more than available
                await BulkTransactionExample.transferMoney('ACC001', 'ACC002', 1500, true);
                expect.fail('Should have thrown an error');
            } catch (error) {
                // The error will be caught and transaction rolled back
            }
            
            // Verify accounts were NOT updated (rollback worked)
            const fromAccount = await Account.findOne({ accountNumber: 'ACC001' });
            const toAccount = await Account.findOne({ accountNumber: 'ACC002' });
            
            expect(fromAccount.balance).to.equal(1000); // Original balance
            expect(toAccount.balance).to.equal(500);    // Original balance
            
            // Verify no transaction record was created
            const transaction = await Transaction.findOne({ fromAccount: 'ACC001' });
            expect(transaction).to.be.null;
        });
    });

    describe('Bulk Operation Performance', () => {
        it('should handle multiple bulk operations efficiently', async () => {
            // Create additional accounts
            await Account.create([
                { accountNumber: 'ACC003', balance: 100 },
                { accountNumber: 'ACC004', balance: 200 }
            ]);
            
            // Start multiple bulk transfers
            const transfers = [
                BulkTransactionExample.transferMoney('ACC001', 'ACC002', 50),
                BulkTransactionExample.transferMoney('ACC001', 'ACC003', 75),
                BulkTransactionExample.transferMoney('ACC002', 'ACC004', 25),
                BulkTransactionExample.transferMoney('ACC003', 'ACC004', 10)
            ];
            
            // Wait for all to complete
            const results = await Promise.all(transfers);
            
            // All should succeed
            results.forEach(result => {
                expect(result.success).to.be.true;
                expect(result.modifiedCount).to.equal(2); // Each transfer modifies 2 accounts
            });
            
            // Verify final balances
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(875); // ACC001: 1000 - 50 - 75
            expect(accounts[1].balance).to.equal(525); // ACC002: 500 + 50 - 25
            expect(accounts[2].balance).to.equal(35);  // ACC003: 100 + 75 - 10
            expect(accounts[3].balance).to.equal(235); // ACC004: 200 + 25 + 10
        });
    });

    describe('Bulk Operation Consistency', () => {
        it('should maintain consistency across multiple bulk operations', async () => {
            // Create additional accounts
            await Account.create([
                { accountNumber: 'ACC003', balance: 100 },
                { accountNumber: 'ACC004', balance: 200 }
            ]);
            
            // Perform a series of bulk operations
            await BulkTransactionExample.transferMoney('ACC001', 'ACC002', 100);
            await BulkTransactionExample.transferMoney('ACC002', 'ACC003', 50);
            await BulkTransactionExample.transferMoney('ACC003', 'ACC004', 25);
            
            // Verify all accounts are consistent
            const accounts = await Account.find({}).sort({ accountNumber: 1 });
            expect(accounts[0].balance).to.equal(900); // ACC001: 1000 - 100
            expect(accounts[1].balance).to.equal(550); // ACC002: 500 + 100 - 50
            expect(accounts[2].balance).to.equal(125); // ACC003: 100 + 50 - 25
            expect(accounts[3].balance).to.equal(225); // ACC004: 200 + 25
            
            // Verify all transaction records were created
            const transactions = await Transaction.find({}).sort({ createdAt: 1 });
            expect(transactions).to.have.length(3);
            expect(transactions[0].amount).to.equal(100);
            expect(transactions[1].amount).to.equal(50);
            expect(transactions[2].amount).to.equal(25);
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await Account.deleteMany({});
        await Transaction.deleteMany({});
    });
});
