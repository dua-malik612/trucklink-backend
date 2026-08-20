// src/users/users.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  /** Same as findByEmail but includes passwordHash — used for login. */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash');
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    let admin = await this.userModel.findOne({ email }).select('+passwordHash');
    if (!admin) {
      admin = new this.userModel({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.ADMIN,
        firstName: 'TruckLink',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
      });
    } else {
      admin.role = UserRole.ADMIN;
      admin.passwordHash = await bcrypt.hash(password, 10);
      admin.firstName = admin.firstName || 'TruckLink';
      admin.lastName = admin.lastName || 'Admin';
      admin.emailVerifiedAt = admin.emailVerifiedAt || new Date();
    }
    await admin.save();
  }
async create(input: CreateUserInput): Promise<any> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    
    const cleanPhone = input.phone && input.phone.trim() !== '' ? input.phone : undefined;

    const user = new this.userModel({
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: cleanPhone,
      emailVerifiedAt: new Date(),
    });
    
    const savedUser = await user.save();
    return savedUser.toObject();
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserDocument> {
    if (dto.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing._id.toString() !== userId) {
        throw new ConflictException('Email already in use by another account');
      }
    }
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: dto },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId).select('+passwordHash');
    if (!user) throw new NotFoundException('User not found');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
  }
}