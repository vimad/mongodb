import { UserWithReference, Profile } from '../../src/associations/one-to-one-references.js';
import mongoose from 'mongoose';
import { expect } from 'chai';
import '../test_helper.js'

describe('One-to-One Relationships - References (with Utilities)', () => {
    
    beforeEach(async () => {
        // Clean up collections
        await UserWithReference.deleteMany({});
        await Profile.deleteMany({});
    });

    describe('Basic CRUD Operations', () => {
        it('should create user and profile separately', async () => {
            const user = await UserWithReference.create({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1-555-123-4567'
            });

            const profile = await Profile.create({
                bio: 'Software developer and tech enthusiast',
                website: 'https://johndoe.com',
                dateOfBirth: new Date('1990-05-15'),
                location: {
                    city: 'San Francisco',
                    country: 'USA',
                    timezone: 'PST'
                },
                socialMedia: {
                    twitter: '@johndoe',
                    linkedin: 'johndoe',
                    github: 'johndoe'
                },
                preferences: {
                    theme: 'dark',
                    language: 'en',
                    notifications: {
                        email: true,
                        push: false,
                        sms: false
                    }
                },
                user: user._id
            });

            expect(profile.user.toString()).to.equal(user._id.toString());
            expect(profile.bio).to.equal('Software developer and tech enthusiast');
        });

        it('should populate user with profile', async () => {
            const user = await UserWithReference.create({
                name: 'Jane Smith',
                email: 'jane@example.com'
            });

            await Profile.create({
                bio: 'UX Designer',
                user: user._id,
                location: {
                    city: 'New York',
                    country: 'USA'
                }
            });

            const userWithProfile = await UserWithReference.findById(user._id).populate('profile');
            expect(userWithProfile.profile).to.not.be.null;
            expect(userWithProfile.profile.bio).to.equal('UX Designer');
        });

        it('should populate profile with user', async () => {
            const user = await UserWithReference.create({
                name: 'Bob Johnson',
                email: 'bob@example.com'
            });

            const profile = await Profile.create({
                bio: 'Data Scientist',
                user: user._id
            });

            const profileWithUser = await Profile.findById(profile._id).populate('user');
            expect(profileWithUser.user).to.not.be.null;
            expect(profileWithUser.user.name).to.equal('Bob Johnson');
        });
    });

    describe('Instance Methods', () => {
        it('should get user with populated profile', async () => {
            const user = await UserWithReference.create({
                name: 'Method User',
                email: 'method@example.com'
            });

            await Profile.create({
                bio: 'Test bio',
                user: user._id
            });

            const userWithProfile = await user.withProfile();
            expect(userWithProfile.profile).to.not.be.null;
        });

        it('should check if user has profile', async () => {
            const user = await UserWithReference.create({
                name: 'Check User',
                email: 'check@example.com'
            });

            // Initially no profile
            const hasProfileBefore = await user.hasProfile();
            expect(hasProfileBefore).to.be.false;

            // Create profile
            await Profile.create({
                bio: 'Test bio',
                user: user._id
            });

            const hasProfileAfter = await user.hasProfile();
            expect(hasProfileAfter).to.be.true;
        });

        it('should get profile with populated user', async () => {
            const user = await UserWithReference.create({
                name: 'Profile User',
                email: 'profile@example.com'
            });

            const profile = await Profile.create({
                bio: 'Test bio',
                user: user._id
            });

            const profileWithUser = await profile.withUser();
            expect(profileWithUser.user).to.not.be.null;
            expect(profileWithUser.user.name).to.equal('Profile User');
        });

        it('should update social media handles', async () => {
            const user = await UserWithReference.create({
                name: 'Social User',
                email: 'social@example.com'
            });

            const profile = await Profile.create({
                bio: 'Test bio',
                user: user._id,
                socialMedia: {
                    twitter: '@oldhandle'
                }
            });

            await profile.updateSocialMedia({
                twitter: '@newhandle',
                github: 'newuser'
            });

            expect(profile.socialMedia.twitter).to.equal('@newhandle');
            expect(profile.socialMedia.github).to.equal('newuser');
        });

        it('should get public profile data', async () => {
            const user = await UserWithReference.create({
                name: 'Public User',
                email: 'public@example.com'
            });

            const profile = await Profile.create({
                bio: 'Public bio',
                website: 'https://public.com',
                dateOfBirth: new Date('1990-01-01'),
                location: {
                    city: 'Public City',
                    country: 'USA'
                },
                socialMedia: {
                    twitter: '@public'
                },
                user: user._id
            });

            const publicData = profile.getPublicData();
            expect(publicData.bio).to.equal('Public bio');
            expect(publicData.website).to.equal('https://public.com');
            expect(publicData.location.toObject()).to.deep.equal({
                city: 'Public City',
                country: 'USA'
            });
            expect(publicData.socialMedia.toObject()).to.deep.equal({
                twitter: '@public'
            });
            expect(publicData.age).to.be.a('number');
        });
    });

    describe('Static Methods (using utility functions)', () => {
        beforeEach(async () => {
            // Create test data
            const users = await UserWithReference.create([
                {
                    name: 'User 1',
                    email: 'user1@example.com',
                    isActive: true
                },
                {
                    name: 'User 2',
                    email: 'user2@example.com',
                    isActive: true
                },
                {
                    name: 'User 3',
                    email: 'user3@example.com',
                    isActive: false
                }
            ]);

            // Create profiles for some users
            await Profile.create([
                {
                    bio: 'Bio 1',
                    user: users[0]._id,
                    website: 'https://user1.com',
                    location: {
                        city: 'New York',
                        country: 'USA'
                    }
                },
                {
                    bio: 'Bio 2',
                    user: users[1]._id,
                    website: 'https://user1.com',
                    location: {
                        city: 'London',
                        country: 'UK'
                    }
                }
            ]);
        });

        it('should find users with profiles', async () => {
            const usersWithProfiles = await UserWithReference.findWithProfiles();
            expect(usersWithProfiles).to.have.length(3);
            
            const usersWithPopulatedProfiles = usersWithProfiles.filter(user => user.profile);
            expect(usersWithPopulatedProfiles).to.have.length(2);
        });

        it('should find users without profiles', async () => {
            const usersWithoutProfiles = await UserWithReference.findWithoutProfiles();
            expect(usersWithoutProfiles).to.have.length(1);
            expect(usersWithoutProfiles[0].name).to.equal('User 3');
        });

        it('should find profiles by location', async () => {
            const nyProfiles = await Profile.findByLocation('New York');
            expect(nyProfiles).to.have.length(1);
            expect(nyProfiles[0].location.city).to.equal('New York');

            const ukProfiles = await Profile.findByLocation(null, 'UK');
            expect(ukProfiles).to.have.length(1);
            expect(ukProfiles[0].location.country).to.equal('UK');
        });

        it('should find profiles with social media', async () => {
            const user = await UserWithReference.create({
                name: 'Social User',
                email: 'social@example.com'
            });

            await Profile.create({
                bio: 'Social bio',
                user: user._id,
                socialMedia: {
                    twitter: '@social',
                    github: 'socialuser'
                }
            });

            const profilesWithSocial = await Profile.findWithSocialMedia();
            expect(profilesWithSocial).to.have.length(1);
            expect(profilesWithSocial[0].socialMedia.twitter).to.equal('@social');
        });

        it('should find users with pagination (using utility functions)', async () => {
            const page1 = await UserWithReference.findWithPagination(1, 2);
            expect(page1).to.have.length(2);

            const page2 = await UserWithReference.findWithPagination(2, 2);
            expect(page2).to.have.length(1);
        });

        it('should find profiles with projection (using utility functions)', async () => {
            const profiles = await Profile.findWithProjection({}, ['bio', 'website', 'location']);
            expect(profiles).to.have.length(2);
            expect(profiles[0].bio).to.exist;
            expect(profiles[0].website).to.exist;
            expect(profiles[0].location).to.exist;
        });

        it('should get user statistics', async () => {
            const stats = await UserWithReference.getUserStats();
            expect(stats.totalUsers).to.equal(3);
            expect(stats.activeUsers).to.equal(2);
            expect(stats.usersWithProfiles).to.equal(2);
            expect(stats.usersWithoutProfiles).to.equal(1);
            expect(stats.profilePercentage).to.equal('66.67');
        });
    });

    describe('Virtual Fields', () => {
        it('should calculate age from date of birth', async () => {
            const user = await UserWithReference.create({
                name: 'Age User',
                email: 'age@example.com'
            });

            const profile = await Profile.create({
                bio: 'Test bio',
                dateOfBirth: new Date('1990-01-01'),
                user: user._id
            });

            expect(profile.age).to.be.a('number');
            expect(profile.age).to.be.greaterThan(30);
        });

        it('should return full location string', async () => {
            const user = await UserWithReference.create({
                name: 'Location User',
                email: 'location@example.com'
            });

            const profile = await Profile.create({
                bio: 'Test bio',
                location: {
                    city: 'Paris',
                    country: 'France'
                },
                user: user._id
            });

            expect(profile.fullLocation).to.equal('Paris, France');
        });

        it('should return city only when country is missing', async () => {
            const user = await UserWithReference.create({
                name: 'City User',
                email: 'city@example.com'
            });

            const profile = await Profile.create({
                bio: 'Test bio',
                location: {
                    city: 'Tokyo'
                },
                user: user._id
            });

            expect(profile.fullLocation).to.equal('Tokyo');
        });
    });

    describe('Validation', () => {
        it('should validate required fields', async () => {
            const user = new UserWithReference({
                name: 'Test User',
                // Missing email
            });

            try {
                await user.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate email format', async () => {
            const user = new UserWithReference({
                name: 'Test User',
                email: 'invalid-email'
            });

            try {
                await user.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate phone format', async () => {
            const user = new UserWithReference({
                name: 'Test User',
                email: 'test@example.com',
                phone: 'invalid-phone'
            });

            try {
                await user.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate profile user reference exists', async () => {
            const profile = new Profile({
                bio: 'Test bio',
                user: new mongoose.Types.ObjectId() // Non-existent user
            });

            try {
                await profile.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate date of birth is in the past', async () => {
            const user = await UserWithReference.create({
                name: 'Future User',
                email: 'future@example.com'
            });

            const profile = new Profile({
                bio: 'Test bio',
                dateOfBirth: new Date('2030-01-01'), // Future date
                user: user._id
            });

            try {
                await profile.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate unique user reference', async () => {
            const user = await UserWithReference.create({
                name: 'Unique User',
                email: 'unique@example.com'
            });

            await Profile.create({
                bio: 'First profile',
                user: user._id
            });

            // Try to create second profile for same user
            const secondProfile = new Profile({
                bio: 'Second profile',
                user: user._id
            });

            try {
                await secondProfile.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.code).to.equal(11000); // Duplicate key error
            }
        });
    });

    describe('Pre/Post Middleware', () => {
        it('should format social media handles on save', async () => {
            const user = await UserWithReference.create({
                name: 'Format User',
                email: 'format@example.com'
            });

            const profile = await Profile.create({
                bio: 'Test bio',
                socialMedia: {
                    twitter: 'johndoe', // No @ prefix
                    instagram: 'johndoe' // No @ prefix
                },
                user: user._id
            });

            expect(profile.socialMedia.twitter).to.equal('@johndoe');
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await UserWithReference.deleteMany({});
        await Profile.deleteMany({});
    });
});
