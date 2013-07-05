/*!
 * jQuery JavaScript Library v@VERSION
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: @DATE
 */
 // 包住整个 js 的匿名函数，
 // 有两个形参，window 和 undefined，这样写的目的是
 // 让 js 中的所有 window 和 undefined 在压缩的时候都被替换掉
 // 比如
 // (function( window, undefined ) {
 //	    console.log( window.jQuery );
 //     console.log( window.test === undefined );
 // })(window);
 // 用工具压缩以后的结果：
 // (function(e,t){console.log(e.jQuery),console.log(e.test===t)})(window)
 // window 和 undefined 被替换成了 e 和 t，如果代码中有很多 window 和 undefined
 // 会节省很多空间
(function( window, undefined ) {

// Can't do this because several apps including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
// Support: Firefox 18+

// 这里原本有一行 "use strict"，根据原注释因为某个 bug 所以
// 把 use strict 去掉了
// bug ticket: http://bugs.jquery.com/ticket/13335
//"use strict";
