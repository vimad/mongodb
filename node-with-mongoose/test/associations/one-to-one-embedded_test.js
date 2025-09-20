import '../test_helper.js'
import {expect} from 'chai';
import {UserWithEmbeddedAddress} from '../../src/associations/one-to-one-embedded.js';

describe('One-to-One Relationships - Embedded Subdocuments (with Utilities)', () => {

    beforeEach(async () => {
        // Clean up collection
        await UserWithEmbeddedAddress.deleteMany({});

    });

    describe('Basic CRUD Operations', () => {
        it('should create a user with embedded address', async () => {
            const user = new UserWithEmbeddedAddress({
                name: 'John Doe',
                email: 'john@example.com',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    zipCode: '10001',
                    country: 'USA'
                }
            });

            await user.save();

            const foundUser = await UserWithEmbeddedAddress.findOne({email: 'john@example.com'});
            expect(foundUser.address.street).to.equal('123 Main St');
            expect(foundUser.address.city).to.equal('New York');
        });

        it('should update embedded address', async () => {
            const user = new UserWithEmbeddedAddress({
                name: 'Jane Doe',
                email: 'jane@example.com',
                address: {
                    street: '456 Oak Ave',
                    city: 'Boston',
                    zipCode: '02101'
                }
            });

            await user.save();

            // Update embedded document
            user.address.city = 'Cambridge';
            await user.save();

            const updatedUser = await UserWithEmbeddedAddress.findOne({email: 'jane@example.com'});
            expect(updatedUser.address.city).to.equal('Cambridge');
        });

        it('should query by embedded field', async () => {
            await UserWithEmbeddedAddress.create({
                name: 'Bob Smith',
                email: 'bob@example.com',
                address: {
                    street: '789 Pine St',
                    city: 'Seattle',
                    zipCode: '98101'
                }
            });

            const usersInSeattle = await UserWithEmbeddedAddress.find({'address.city': 'Seattle'});
            expect(usersInSeattle).to.have.length(1);
            expect(usersInSeattle[0].name).to.equal('Bob Smith');
        });
    });

    describe('Instance Methods', () => {
        it('should get full address using instance method', async () => {
            const user = await UserWithEmbeddedAddress.create({
                name: 'Alice Johnson',
                email: 'alice@example.com',
                address: {
                    street: '321 Elm St',
                    city: 'Portland',
                    zipCode: '97201',
                    country: 'USA'
                }
            });

            const fullAddress = user.getFullAddress();
            expect(fullAddress).to.equal('321 Elm St, Portland, 97201, USA');
        });

        it('should update address using instance method', async () => {
            const user = await UserWithEmbeddedAddress.create({
                name: 'Charlie Brown',
                email: 'charlie@example.com',
                address: {
                    street: '654 Maple Ave',
                    city: 'Denver',
                    zipCode: '80201'
                }
            });

            await user.updateAddress({city: 'Boulder', zipCode: '80301'});

            const updatedUser = await UserWithEmbeddedAddress.findById(user._id);
            expect(updatedUser.address.city).to.equal('Boulder');
            expect(updatedUser.address.zipCode).to.equal('80301');
        });

        it('should check if user is in specific city', async () => {
            const user = await UserWithEmbeddedAddress.create({
                name: 'David Wilson',
                email: 'david@example.com',
                address: {
                    street: '987 Cedar Rd',
                    city: 'Austin',
                    zipCode: '73301'
                }
            });

            expect(user.isInCity('Austin')).to.be.true;
            expect(user.isInCity('Dallas')).to.be.false;
        });
    });

    describe('Static Methods (using utility functions)', () => {
        beforeEach(async () => {
            // Create test data
            await UserWithEmbeddedAddress.create([
                {
                    name: 'User 1',
                    email: 'user1@example.com',
                    address: {street: '123 St', city: 'New York', zipCode: '10001', country: 'USA'}
                },
                {
                    name: 'User 2',
                    email: 'user2@example.com',
                    address: {street: '456 St', city: 'Boston', zipCode: '02101', country: 'USA'}
                },
                {
                    name: 'User 3',
                    email: 'user3@example.com',
                    address: {street: '789 St', city: 'New York', zipCode: '10002', country: 'USA'}
                }
            ]);
        });

        it('should find users by city', async () => {
            const nyUsers = await UserWithEmbeddedAddress.findByCity('New York');
            expect(nyUsers).to.have.length(2);

            const bostonUsers = await UserWithEmbeddedAddress.findByCity('Boston');
            expect(bostonUsers).to.have.length(1);
        });

        it('should find users by country', async () => {
            const usUsers = await UserWithEmbeddedAddress.findByCountry('USA');
            expect(usUsers).to.have.length(3);
        });

        it('should find users by ZIP code range', async () => {
            const nyUsers = await UserWithEmbeddedAddress.findByZipRange('10000', '10099');
            expect(nyUsers).to.have.length(2);
        });

        it('should find users with pagination (using utility functions)', async () => {
            const page1 = await UserWithEmbeddedAddress.findWithPagination(1, 2);
            expect(page1).to.have.length(2);

            const page2 = await UserWithEmbeddedAddress.findWithPagination(2, 2);
            expect(page2).to.have.length(1);
        });

        it('should find users with projection (using utility functions)', async () => {
            const users = await UserWithEmbeddedAddress.findWithProjection({}, ['name', 'email']);
            expect(users).to.have.length(3);
            expect(users[0].name).to.exist;
            expect(users[0].email).to.exist;
            expect(users[0].address).to.be.undefined; // Not in projection
        });
    });

    describe('Virtual Fields', () => {
        it('should return formatted address', async () => {
            const user = await UserWithEmbeddedAddress.create({
                name: 'Test User',
                email: 'test@example.com',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    zipCode: '12345',
                    country: 'USA'
                }
            });

            expect(user.formattedAddress).to.equal('123 Test St, Test City, 12345, USA');
        });

        it('should return location string', async () => {
            const user = await UserWithEmbeddedAddress.create({
                name: 'Test User',
                email: 'test2@example.com',
                address: {
                    street: '456 Test Ave',
                    city: 'Test Town',
                    zipCode: '54321',
                    country: 'Canada'
                }
            });

            expect(user.location).to.equal('Test Town, Canada');
        });
    });

    describe('Validation', () => {
        it('should validate required fields', async () => {
            const user = new UserWithEmbeddedAddress({
                name: 'Test User',
                // Missing address
            });

            try {
                await user.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                console.log(error);
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate email format', async () => {
            const user = new UserWithEmbeddedAddress({
                name: 'Test User',
                email: 'invalid-email',
                address: {
                    street: '123 St',
                    city: 'Test City',
                    zipCode: '12345'
                }
            });

            try {
                await user.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate ZIP code format', async () => {
            const user = new UserWithEmbeddedAddress({
                name: 'Test User',
                email: 'test@example.com',
                address: {
                    street: '123 St',
                    city: 'Test City',
                    zipCode: 'invalid-zip'
                }
            });

            try {
                await user.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });
    });

    describe('Coordinates Support', () => {
        it('should save user with coordinates', async () => {
            const user = await UserWithEmbeddedAddress.create({
                name: 'GPS User',
                email: 'gps@example.com',
                address: {
                    street: '123 GPS St',
                    city: 'GPS City',
                    zipCode: '12345',
                    coordinates: {
                        latitude: 40.7128,
                        longitude: -74.0060
                    }
                }
            });

            const foundUser = await UserWithEmbeddedAddress.findById(user._id);
            expect(foundUser.address.coordinates.latitude).to.equal(40.7128);
            expect(foundUser.address.coordinates.longitude).to.equal(-74.0060);
        });

        it('should find users with coordinates', async () => {
            await UserWithEmbeddedAddress.create({
                name: 'GPS User 1',
                email: 'gps1@example.com',
                address: {
                    street: '123 GPS St',
                    city: 'GPS City',
                    zipCode: '12345',
                    coordinates: {
                        latitude: 40.7128,
                        longitude: -74.0060
                    }
                }
            });

            await UserWithEmbeddedAddress.create({
                name: 'GPS User 2',
                email: 'gps2@example.com',
                address: {
                    street: '456 No GPS St',
                    city: 'No GPS City',
                    zipCode: '54321'
                }
            });

            const usersWithCoords = await UserWithEmbeddedAddress.findWithCoordinates();
            expect(usersWithCoords).to.have.length(1);
            expect(usersWithCoords[0].name).to.equal('GPS User 1');
        });

        it('should fail users with invalid coordinates', async () => {

            try {
                await UserWithEmbeddedAddress.create({
                    name: 'GPS User 1',
                    email: 'gps1@example.com',
                    address: {
                        street: '123 GPS St',
                        city: 'GPS City',
                        zipCode: '12345',
                        coordinates: {
                            latitude: 90.7128,
                            longitude: -74.0060
                        }
                    }
                });
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.message).to.equal('Latitude must be between -90 and 90');
            }
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await UserWithEmbeddedAddress.deleteMany({});
    });
});
