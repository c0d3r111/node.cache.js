import fs from 'fs/promises';

const nothing = () => null;

export default class {
    constructor(size) {
        this._maxsize  = size || 1e7;
        this._size     = 0;
        this.store     = {};
        this.checklist = new Set();

        void this.check();
    }
    
    async check() {
        await new Promise(resolve => setTimeout(resolve, 1e4));

        const list = Array.from(this.checklist);

        void this.checklist.clear();

        for (let key of list) {
            const focus = this.store[key];

            if (!focus || !focus.file) continue;
            
            const stats = await fs.stat(focus.file).catch(nothing);

            if (!stats) continue;

        	void (
                (new Date(stats.mtime).getTime()) > focus.added
        		  ? this.del(key)
        		  : 0
            );
        }

        return void this.check();
    }

    clear()       {
    	void this.checklist.clear();
    	void (this.store = {});
    	void (this._size = 0);

    	return;
    }
    del(name)     {
    	if (!this.store[name]) return;

    	void (this._size -= this.store[name].size);
    	delete this.store[name];
    }
    free(amount)  {
        return new Promise(resolve => {
        	let min     = Infinity;
        	let size    = 0;
        	let target;

            void Object.keys(this.store).forEach(key => {
                let focus = this.store[key];
                
              	if (focus.accessed < min) {
                    min    = focus.accessed;
                  	target = key;
                  	size   = focus.size;
                }
              	
                return;
            });

            void this.del(target);
            void resolve(amount - size > 0
            	? this.free(amount - size)
            	: null
            );
        });
    }
    get(name)     {
        let entry = this.store[name];

        if (!entry) return null;

        void (entry.accessed = Date.now());
        void this.checklist.add(name);

        return entry;
    }
    has(name)     {
        return name in this.store;
    }
    set(entry)    {
        if (!entry.key || !entry.value) return;

        const size = Buffer.byteLength(
            Buffer.isBuffer(entry.value)
                ? entry.value
                : typeof entry.value === 'string' 
        		  ? entry.value 
        		  : JSON.stringify(entry.value)
        );
        const now  = Date.now();

        void (this._size += size);
        void (this.store[entry.key] = {
        	accessed : now,
        	added    : now,
        	size     : size,
        	data     : entry.value,
        	zip      : entry.zipped,
            file     : entry.file,
        });

        return this._size > this._maxsize
            ? void this.free(size)
            : void 0;
    }
}