import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon from 'argon2'

@Injectable()
export class UserService {
    constructor (
        private readonly prisma: PrismaService
    ) {}

    async getUserInfo(username) {
        const user = await this.prisma.user.findUnique({
            where: {
                username: username
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phoneNumber: true,
            }
        })

        if(!user) 
            throw new NotFoundException('User not found')

        return { user } 
    }

    async changeIn4(data: any, res: Response) {
        try {
            if(data.username === "" || data.fullName === "" || data.email === "" || data.phoneNumber === "")
                throw new BadRequestException('Look like you are missing something')

            // Get user by data.username
            const user = await this.prisma.user.findUnique({
                where: {
                    username: data.username
                },
                select: {
                    email: true, 
                    phoneNumber: true
                }
            })

            // check if user exists in database
            if(!user) 
                throw new NotFoundException('User not found')

            // Checking email from request data
            const userByEmail = await this.prisma.user.findUnique({
                where: {
                    email: data.email
                }
            })
            if(userByEmail && data.email !== user.email)
                throw new BadRequestException('This email is already existed in the database')

            // Checking phoneNumber from request data
            const userByPhoneNumber = await this.prisma.user.findUnique({
                where: {
                    phoneNumber: data.phoneNumber
                }
            })
            if(userByPhoneNumber && data.phoneNumber !== user.phoneNumber)
                throw new BadRequestException('This phone number is already existed in the database')
    
            // If everything is fine
            await this.prisma.user.update({
                where: {
                    username: data.username
                },
                data: {
                    fullName: data.fullName,
                    email: data.email,
                    phoneNumber: data.phoneNumber
                }
            })
            res.sendStatus(200)
        }
        catch (err) {
            res.json({ error: err.message })
        }
    }

    async changePassword(data: any, res: Response) {
        try {
            if(data.newPwd === "")
                throw new BadRequestException('Look like you are missing something')

            // ---------------------------- Remove these regex temporarily for testing ----------------------------
            // if(!data.newPwd.match(/^(?=.*[A-Z])[a-zA-Z0-9]{8,}$/))
            //     throw new BadRequestException('Your new password should only contain alphanumeric character, at least 8 chars, at least 1 uppercase')
            // ------------------------------------------------------------------------------------------------------

            const user = await this.prisma.user.findUnique({
                where: {
                    username: data.username
                },
                select: {
                    hash: true
                }
            })

            const pwMatches = await argon.verify(user.hash, data.oldPwd)

            // check if user exists in database
            if(!user) 
                throw new NotFoundException('User not found')

            // check if new pwd and confirm pwd are matched
            if(data.newPwd !== data.confirmPwd)
                throw new BadRequestException('Your confirm password should match with your new password')

            // check if old pwd is valid
            if(!pwMatches) 
                throw new BadRequestException('Wrong password')

            // If none error caught
            const new_hash = await argon.hash(data.newPwd)

            await this.prisma.user.update({
                where: {
                    username: data.username
                },
                data: {
                    hash: new_hash
                }
            })

            res.sendStatus(200)
        }
        catch (err) {
            res.json({ error: err.message })
        }
    }
}
