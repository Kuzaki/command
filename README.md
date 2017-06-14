## Usage
Type `/proxy` into chat to switch to the command line, then enter the specified command. To pass strings containing spaces as arguments, enclose them in quotes (`""` or `''`). To enclude quotes or backslashes in arguments, precede them with a backslash `\`.

### Examples
```
/proxy mymod
```
```
/proxy mymod dostuff
```
```
/proxy mymod 123 456 'Hello ponies!'
```
```
/proxy mymod "This is a string containing 'quotes', \"similar quotes\", and \\backslashes."
```

## Developers
To use Command in your module, first require it, then call the factory `Command(dispatch)` to get an instance of `Command`.

### Example
```javascript
const Command = require('command')

module.exports = function MyMod(dispatch) {
	const command = Command(dispatch)

	command.add('mymod', (x, y, z) => {
		command.message('Parameters: ' + [x, y, z].join(', '))
	})
}
```

## Command
### Methods
#### `add(command, callback)`
Adds one or more command hooks. All commands must be unique and are case insensitive.

`command` may be a string or an array of strings.

`callback` receives string arguments from the command hooked.

#### `message(msg)`
Sends a message in the `[Proxy]` channel.

#### `exec(str)`
Executes a raw command string. If `str` is an array then it will be interpreted as arguments instead.

Returns `true` on command found, `false` otherwise. May throw an exception if the callback contains an error.
