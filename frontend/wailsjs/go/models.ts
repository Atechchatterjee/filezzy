export namespace types {
	
	export class AdditionalParams {
	
	
	    static createFrom(source: any = {}) {
	        return new AdditionalParams(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class FileStruct {
	
	
	    static createFrom(source: any = {}) {
	        return new FileStruct(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

