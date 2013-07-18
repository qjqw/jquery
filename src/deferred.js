jQuery.extend({
	// 好乱
	Deferred: function( func ) {
		var 
			// 类型 map
			tuples = [
				// action, add listener, listener list, final state
				// 动作、对应事件、事件列表、最终状态
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				// always 会把 done 和 fail 都执行一遍
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				// then 的作用是可以把 down, fail 和 progress 写进一个函数中
				// 如： $.Deferred( fn ).then( fnDown, fnFail, fnProgress );
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ action + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				// 如果提供了 obj，就把 promise 对象 extend 到 obj 里，否则直接返回 promise。
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			// deferred 对象
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			// 把通过 jQuery.Callbacks 创建的 Callbacks 对象的 add 函数与对应的名字联系起来
			// promise = {
			//     /* other funcs here */
			//     'done': {Callback Object}.add,
			//     'fail': {Callback Object}.add,
			//     'progress': {Callback Object}.add
			// }
			promise[ tuple[1] ] = list.add;

			// Handle state
			// 如果当前状态有处理结果，也就是 resolved 和 rejected，
			// 向 list 中添加一些函数 把 state 变为最终态，并 disable 另外一个对象，因为
			// 已经 resolved 就不能 rejected，rejected 也一样，同时 lock 住 notify
			if ( stateString ) {
				// 向 Callbacks 中添加相应函数
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				// disable 另外一个对象，比如 done 会 disable reject，fail 会 disable resolve
				// 同时会锁住 progress
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				// 调用 deferred[ resolveWith | rejectWith | notifyWith ]
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			// 向 deferred 中添加 resolveWith, rejectWith, notifyWith 方法
			// 实际上是三个相对的 Callbacks 对象的 fireWith
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		// 把 promise 的内容全都放到 deferred 中
		promise.promise( deferred );

		// Call given func if any
		// 如果调用 jQuery.Deferred 的时候传进了 function，在这里直接调用
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		// 返回 deferred 对象
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});
