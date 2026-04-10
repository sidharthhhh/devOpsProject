export const generateMemberId = (prefix: string, count: number) => {

 const number = String(count + 1).padStart(4, "0");

 return `${prefix}-${number}`;

};