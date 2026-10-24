# Backend API

## Register a user

Creates a user account and returns an authentication token.

### Endpoint

```http
POST /users/register
Content-Type: application/json
```

The `/users` prefix is mounted by the application, and the registration route is
`/register`.

### Request body

Send a JSON object with a `fullname` object, an email address, and a password:

```json
{
  "fullname": {
    "firstname": "Ada",
    "lastname": "Lovelace"
  },
  "email": "ada@example.com",
  "password": "example-password"
}
```

| Field | Required | Requirements |
| --- | --- | --- |
| `fullname.firstname` | Yes | At least 3 characters. Leading and trailing whitespace is trimmed before validation. |
| `fullname.lastname` | No | If provided, must be at least 3 characters. |
| `email` | Yes | Must be a valid email address. |
| `password` | Yes | At least 6 characters. |

The request body must be JSON. The password is hashed before it is stored.

### Responses

#### `201 Created`

Registration succeeded. The response contains a signed token and the created
user:

```json
{
  "token": "<signed-jwt>",
  "user": {
    "_id": "<user-id>",
    "fullname": {
      "firstname": "Ada",
      "lastname": "Lovelace"
    },
    "email": "ada@example.com"
  }
}
```

The precise user fields and additional Mongoose metadata may vary. The
controller returns the newly created user document directly; because of that,
the response may also include the hashed password. Do not treat the password
hash as safe to expose.

#### `400 Bad Request`

One or more request fields failed validation. The response includes an `errors`
array with details for each validation failure:

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Invalid Email",
      "path": "email",
      "location": "body"
    }
  ]
}
```

#### `500 Internal Server Error`

An unexpected server-side failure occurred, such as a database error or a
failure while generating the authentication token. The application does not
define a custom error response body for these failures.

### Configuration

The backend loads environment variables from its `.env` file. Registration
requires `MONGO_URI` for the MongoDB connection and `JWT_SECRET` for signing the
authentication token. Keep both values private and do not commit real
credentials.
