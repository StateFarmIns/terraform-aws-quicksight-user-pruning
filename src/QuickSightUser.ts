import { User } from '@aws-sdk/client-quicksight'

export class QuickSightUser {
	arn: string // arn:aws:quicksight:<REGION>:<ACCOUNT>:user/default/<IAM ROLE NAME>/<EMAIL>
	email: string
	iamRoleName: string
	iamRoleId: string // Like ASIAGREHGHTHRTH3XJG12
	lastAccess: Date // Comes from CloudTrail
	role: QuickSightRole
	username: string // <IAM ROLE>/<EMAIL>
	invalid: boolean // User is invalid if username is "N/A". See README.md for more details

	constructor(quickSightUser: User) {
		const iamRoleId = quickSightUser.PrincipalId.replace('federated/iam/', '').split(':')[0] // Original is federated/iam/ASIAGREHGHTHRTH3XJG12:email@example.com

		this.arn = quickSightUser.Arn
		this.email = quickSightUser.Email
		this.iamRoleId = iamRoleId
		this.role = QuickSightRole[quickSightUser.Role as keyof typeof QuickSightRole] // Only values that will be returned // also the keyof typeof hack came from here https://stackoverflow.com/a/42623905
		this.username = quickSightUser.UserName
		this.iamRoleName = quickSightUser.UserName.split('/')[0]
		this.invalid = this.username === 'N/A'
	}
}

export enum QuickSightRole {
	READER = 'READER', AUTHOR = 'AUTHOR', ADMIN = 'ADMIN'
}