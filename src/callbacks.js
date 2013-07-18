// 用于缓存 options
var optionsCache = {};

// 函数作用
// createOptions( 'test1 test2' );
// 返回值 { test1: true, test2: true }; 
function createOptions( options ) {
	// 在 optionsCache 中创建一个名为 options 的空对象
	var object = optionsCache[ options ] = {};

	// options.match( core_rnotwhite ); 利用 match 和 正则 把一个字符串中非空格字符
	// 拆分到一个 array 里，'a b c'.match( core_rnotwhite)，会返回  [ 'a', 'b', 'c' ]
	// 然后用 each 把每个结果添加到 object 中并设置为 true
	jQuery.each( options.match( core_rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
 // Callbacks 利用了闭包原理，在 function 定义了一些内部参数，
 // 如状态标志、函数数组、fire操作。返回了一个对外的 Object，里面
 // 包含需要用到的函数。
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	// 如果 options 是 string 类型，先检查 optionsCache 中是否已经有对应值，如果没有则
	// 通过 createOptions 创建一个新 object，如果不是 string，则用 extend 函数返回一个
	// object(包括 number, boolean 等等，都会返回一个 object，以保证后面可以继续进行..)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		// 是否正在 firing 函数
		firing,
		// Last fire value (for non-forgettable lists)
		// 最后一个 fire 的值
		memory,
		// Flag to know if list was already fired
		// 标记函数列表是否已经执行过了
		fired,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		// 正在 fire 的函数下标
		firingIndex,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// Actual callback list
		// 存放函数的 list
		list = [],
		// Stack of fire calls for repeatable lists
		// 参数栈，如果正在 firing 函数，而且函数内也调用了 fire 函数，就把
		// 函数放进栈里，等待上一个参数执行完以后再依次执行栈内参数。
		// 如果设置了 once，就把 stack 设置为 false
		stack = !options.once && [],
		// Fire callbacks
		// fire 函数
		fire = function( data ) {
			// 如果 options 设置了 memory，就把 data 的值放到 memory 中
			memory = options.memory && data;
			// 设置 fired 为 true
			fired = true;
			// 设置 fireIndex
			firingIndex = firingStart || 0;
			// 设置开始，主要用于带 memory 参数的情况
			firingStart = 0;
			// 记录列表长度
			firingLength = list.length;
			// 标记正在执行函数
			firing = true;
			// 执行 list 里的函数
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				// 这个函数的 data 并不是 $.Callback().fire( SomeData ) 传进的参数，而是通过
				// fireWith 传进来的值，已经被处理过了。如果设置了了 stopOnFalse，就不再继续执行后面的函数。
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			// 把执行标记重新设置为 false
			firing = false;
			if ( list ) {
				// 判断 stack 是否是非值
				if ( stack ) {
					// 如果 stack 内有参数，就继续 fire
					if ( stack.length ) {
						fire( stack.shift() );
					}
				// 走到这一步需要同时满足 list && !stack && memory
				// 如果设置了 memory，同时设置了 lock 或者 once，在 add 函数时，就会走这一步，以完成 memory 的作用
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		// 对外提供的函数 Object
		self = {
			// Add a callback or a collection of callbacks to the list
			// 向 list 用添加函数，可以是一个，也可以是多个
			add: function() {
				// 确保没有被 disable
				if ( list ) {
					// First, we save the current length
					// 保存长度
					var start = list.length;
					(function add( args ) {
						// 拆分 arguments，对每个参数分别处理
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								// 如果参数是一个 function 并且没有 unique 参数，
								// 也没有被添加过，就把 function push 到 list 中
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							// 如果传的参数是数组，递归调用 add，再次拆分
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					// 如果正在 firing 函数，把 firingLength 重置
					// 这个情况主要用于在函数中再次添加函数，比如
					// var a = $.Callbacks();
					// a.add(function(){ 
					// 	alert( '外部函数：' + arguments[0] );
					// 	a.add(function(){
					// 		alert( '内部函数：' + arguments[0] );
					// 	});
					// });
					// a.fire('test');
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					// 如果有 memory 参数，会在 add 函数的时候从第一个被添加的函数开始
					// 进行一次 fire
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			// 从 list 中删掉一个函数
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						// 用 inArray 找到结点，while 的作用是当设置了 unique 属性以后，
						// list 中可能存在同一个函数的多个引用，所以用 while 删掉
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							// 删除元素
							list.splice( index, 1 );
							// Handle firing indexes
							// 如果正在 firing 函数，修改 length 和 index，
							// 写这类功能很容易忘记内部函数的操作，比如 Callbacks 中传进的函数
							// 又删除了 list 中的函数，这种情况比较常见 ...
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				// 如果传了 fn，查找 fn 是否在 list 中，否则判断 list 是不是为空
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			// 清空函数列表
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			// 锁住，如果没设置 memory 就会执行 disable
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				// 处理参数
				args = [ context, args.slice ? args.slice() : args ];
				// 如果 lock 或者设置了 once， stack 为 undefined，
				// 所以除了第一次执行 fire 的时候 ( !fired || stack ) 为 true，
				// 以后的执行都为 false，不会继续执行，所以这里完成了 once 和 lock 的功能
				if ( list && ( !fired || stack ) ) {
					// 如果正在 firing 函数，就把数据 push 进 stack，等待上次 fire 完成后继续执行
					if ( firing ) {
						stack.push( args );
					// 否则直接调用 fire
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			// 可以传 n 个参数 ..
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};
