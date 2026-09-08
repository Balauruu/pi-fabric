import {DatabaseSync} from 'node:sqlite';
const [path,mode]=process.argv.slice(2),db=new DatabaseSync(path!);db.exec('PRAGMA busy_timeout=5000');
if(mode==='wal-committed'){db.exec("PRAGMA journal_mode=WAL; UPDATE user_data SET value='WAL committed'");process.send?.('ready');process.on('message',()=>{db.close();process.exit(0);});}
else if(mode==='reader'){db.exec('BEGIN');db.prepare('SELECT * FROM user_data').all();process.send?.('ready');process.on('message',()=>{db.exec('COMMIT');db.close();process.exit(0);});}
else{if(mode==='crash')db.exec('PRAGMA cache_size=1; PRAGMA cache_spill=ON');db.exec('BEGIN IMMEDIATE');db.exec(mode==='crash'?"UPDATE user_data SET value=hex(zeroblob(1048576))":"UPDATE user_data SET value='uncommitted'");process.send?.('ready');process.on('message',message=>{if(message==='commit'){db.exec('COMMIT');db.close();process.exit(0);}if(message==='rollback'){db.exec('ROLLBACK');db.close();process.exit(0);}});}
