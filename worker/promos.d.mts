export function promoError(status:number,message:string):never;
export function promoHash(value:string):Promise<string>;
export function promoTables(db:D1Database|undefined):Promise<void>;
export function promoEmail(value:unknown):string;
export function redeemPromo(db:D1Database|undefined,request:Request,site:string,product:string,raw:unknown,email:string):Promise<{id:string;created:number;product:string}>;
