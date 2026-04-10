import { Request,Response } from "express";
import { registerUser,loginUser } from "../services/auth.service";

export const register = async (req: Request,res: Response) => {

 try{

 const {email,password,role} = req.body;

 const user = await registerUser(email,password,role);

 res.json(user);

 }catch(err){

 res.status(400).json({message:(err as Error).message});

 }

};

export const login = async (req: Request,res: Response) => {

 try{

 const {email,password} = req.body;

 const data = await loginUser(email,password);

 res.json(data);

 }catch(err){

 res.status(400).json({message:(err as Error).message});

 }

};