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
 // 包含需要用到的函数。个人觉得这样并不是最好的写法，因为每次执行 Callbacks() 都要创建
 // 一个包含有 add、remove 等等函数的新对象，相对于 prototype 创建对象
 // 的方式理论上性能差一些
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
			// 设置开始
			firingStart = 0;
			// 记录列表长度
			firingLength = list.length;
			// 标记正在执行函数
			firing = true;
			// 执行 list 里的函数
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				// 这个函数的 data 并不是 $.Callback().fire( DATA ) 传进的参数，而是通过
				// 下面的 fireWith 传进来的值。如果设置了了 stopOnFalse，就不再继续执行后面的函数。
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			// 把执行标记重新设置为 false
			firing = false;
			if ( list ) {
				// 默认都是走一步的，但是如果 lock、disable、once、memory 等操作，会把
				// stack 设置为非值，会走下面的步骤
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
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
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
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
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
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
