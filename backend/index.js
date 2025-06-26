require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');


const app = express();
const port = process.env.PORT || 3001;
const TEMP_USER_ID = process.env.TEMP_USER_ID;
const APP_PASSWORD = process.env.APP_PASSWORD;


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json());

async function createTables() {
  let client;
  try {
    client = await pool.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, name)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        amount NUMERIC(15, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        category VARCHAR(255),
        transaction_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(255) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, category, start_date, end_date)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, name, type)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lending_borrowing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        person VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        date DATE NOT NULL,
        due_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'outstanding',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at') THEN
              CREATE TRIGGER set_users_updated_at
              BEFORE UPDATE ON users
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END
      $$;
    `);

    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_accounts_updated_at') THEN
              CREATE TRIGGER set_accounts_updated_at
              BEFORE UPDATE ON accounts
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END
      $$;
    `);

    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_transactions_updated_at') THEN
              CREATE TRIGGER set_transactions_updated_at
              BEFORE UPDATE ON transactions
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END
      $$;
    `);

    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_budgets_updated_at') THEN
              CREATE TRIGGER set_budgets_updated_at
              BEFORE UPDATE ON budgets
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END
      $$;
    `);

    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_categories_updated_at') THEN
              CREATE TRIGGER set_categories_updated_at
              BEFORE UPDATE ON categories
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END
      $$;
    `);

    await client.query(`
      INSERT INTO users (id, username, email, password_hash)
      VALUES ($1, 'tempuser', 'temp@example.com', 'hashedpassword')
      ON CONFLICT (id) DO NOTHING;
    `, [TEMP_USER_ID]);

    console.log('Tables created and temporary user ensured successfully!');
  } catch (err) {
    console.error('Error creating tables or inserting user:', err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

createTables();

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).send(`Database connected: ${result.rows[0].now}`);
  } catch (err) {
    console.error('Database connection test failed:', err);
    res.status(500).send('Database connection failed');
  }
});

app.get('/accounts', async (req, res) => {
  try {
    const allAccounts = await pool.query('SELECT id, name, type, balance, currency, created_at, updated_at FROM accounts WHERE user_id = $1 ORDER BY created_at ASC;', [TEMP_USER_ID]);
    res.json({ accounts: allAccounts.rows });
  } catch (err) {
    console.error('Error fetching accounts:', err.stack);
    res.status(500).json({ message: 'Failed to fetch accounts', error: err.message });
  }
});

app.get('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const account = await pool.query('SELECT id, name, type, balance, currency, created_at, updated_at FROM accounts WHERE id = $1 AND user_id = $2;', [id, TEMP_USER_ID]);
    if (account.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found or does not belong to user.' });
    }
    res.json({ account: account.rows[0] });
  } catch (err) {
    console.error('Error fetching account:', err.stack);
    res.status(500).json({ message: 'Failed to fetch account', error: err.message });
  }
});

app.post('/accounts', async (req, res) => {
  const { name, type, balance, currency } = req.body;
  if (!name || !type || balance === undefined || !currency) {
    return res.status(400).json({ message: 'Missing required account fields.' });
  }
  if (typeof balance !== 'number') {
    return res.status(400).json({ message: 'Balance must be a number.' });
  }

  try {
    const newAccount = await pool.query(
      'INSERT INTO accounts (user_id, name, type, balance, currency) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, type, balance, currency, created_at, updated_at;',
      [TEMP_USER_ID, name, type, balance, currency]
    );
    res.status(201).json({ message: 'Account added successfully!', account: newAccount.rows[0] });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'accounts_user_id_name_key') {
      return res.status(409).json({ message: `Account with name '${name}' already exists.` });
    }
    console.error('Error adding account:', err.stack);
    res.status(500).json({ message: 'Failed to add account', error: err.message });
  }
});

app.put('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, balance, currency } = req.body;

  let query = 'UPDATE accounts SET updated_at = CURRENT_TIMESTAMP';
  const queryParams = [];
  let paramCount = 1;

  if (name !== undefined) { query += `, name = $${++paramCount}`; queryParams.push(name); }
  if (type !== undefined) { query += `, type = $${++paramCount}`; queryParams.push(type); }
  if (balance !== undefined) {
    if (typeof balance !== 'number') {
      return res.status(400).json({ message: 'Balance must be a number.' });
    }
    query += `, balance = $${++paramCount}`; queryParams.push(balance);
  }
  if (currency !== undefined) { query += `, currency = $${++paramCount}`; queryParams.push(currency); }

  query += ` WHERE id = $${++paramCount} AND user_id = $${++paramCount} RETURNING id, name, type, balance, currency, created_at, updated_at;`;
  queryParams.push(id, TEMP_USER_ID);

  try {
    const updatedAccount = await pool.query(query, queryParams);
    if (updatedAccount.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found or does not belong to user.' });
    }
    res.json({ message: 'Account updated successfully!', account: updatedAccount.rows[0] });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'accounts_user_id_name_key') {
      return res.status(409).json({ message: `Account with name '${name}' already exists for this user.` });
    }
    console.error('Error updating account:', err.stack);
    res.status(500).json({ message: 'Failed to update account', error: err.message });
  }
});

app.delete('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleteResult = await pool.query('DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id;', [id, TEMP_USER_ID]);
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found or does not belong to user.' });
    }
    res.json({ message: 'Account deleted successfully!', id: id });
  } catch (err) {
    console.error('Error deleting account:', err.stack);
    res.status(500).json({ message: 'Failed to delete account', error: err.message });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    const allTransactions = await pool.query(
      'SELECT id, user_id, account_id, amount, type, description, category, transaction_date, created_at, updated_at FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC, created_at DESC;',
      [TEMP_USER_ID]
    );
    res.json({ transactions: allTransactions.rows });
  } catch (err) {
    console.error('Error fetching transactions:', err.stack);
    res.status(500).json({ message: 'Failed to fetch transactions', error: err.message });
  }
});

app.post('/transactions', async (req, res) => {
  const { account_id, amount, type, description, category, transaction_date } = req.body;

  if (!account_id || amount === undefined || !type || !description || !category || !transaction_date) {
    return res.status(400).json({ message: 'Missing required transaction fields.' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'Type must be "income" or "expense".' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const newTransactionResult = await client.query(
      'INSERT INTO transactions (user_id, account_id, amount, type, description, category, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, account_id, amount, type, description, category, transaction_date, created_at, updated_at;',
      [TEMP_USER_ID, account_id, amount, type, description, category, transaction_date]
    );
    const newTransaction = newTransactionResult.rows[0];

    const balanceChange = type === 'income' ? amount : -amount;
    const updateAccountResult = await client.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, balance;',
      [balanceChange, account_id, TEMP_USER_ID]
    );

    if (updateAccountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Associated account not found or does not belong to user.' });
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Transaction added and account balance updated successfully!',
      transaction: newTransaction,
      updatedAccountBalance: updateAccountResult.rows[0].balance,
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error adding transaction:', error.stack);
    res.status(500).json({
      message: 'Failed to add transaction',
      error: error.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.put('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { account_id, amount, type, description, category, transaction_date } = req.body;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const oldTransactionResult = await client.query(
      'SELECT account_id, amount, type FROM transactions WHERE id = $1 AND user_id = $2;',
      [id, TEMP_USER_ID]
    );

    if (oldTransactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found or does not belong to user.' });
    }
    const oldTransaction = oldTransactionResult.rows[0];
    const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;

    await client.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3;',
      [oldBalanceChange, oldTransaction.account_id, TEMP_USER_ID]
    );

    let query = 'UPDATE transactions SET updated_at = CURRENT_TIMESTAMP';
    const queryParams = [];
    let paramCount = 1;

    if (account_id !== undefined) { query += `, account_id = $${++paramCount}`; queryParams.push(account_id); }
    if (amount !== undefined) {
      const newAmount = parseFloat(amount);
      if (isNaN(newAmount) || newAmount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Amount must be a positive number.' });
      }
      query += `, amount = $${++paramCount}`; queryParams.push(newAmount);
    }
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Type must be "income" or "expense".' });
      }
      query += `, type = $${++paramCount}`; queryParams.push(type);
    }
    if (description !== undefined) { query += `, description = $${++paramCount}`; queryParams.push(description); }
    if (category !== undefined) { query += `, category = $${++paramCount}`; queryParams.push(category); }
    if (transaction_date !== undefined) { query += `, transaction_date = $${++paramCount}`; queryParams.push(transaction_date); }

    query += ` WHERE id = $${++paramCount} AND user_id = $${++paramCount} RETURNING id, user_id, account_id, amount, type, description, category, transaction_date, created_at, updated_at;`;
    queryParams.push(id, TEMP_USER_ID);

    const updatedTransactionResult = await client.query(query, queryParams);

    if (updatedTransactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found or does not belong to user.' });
    }
    const updatedTransaction = updatedTransactionResult.rows[0];

    const newBalanceChange = updatedTransaction.type === 'income' ? updatedTransaction.amount : -updatedTransaction.amount;
    const finalUpdateAccountResult = await client.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, balance;',
      [newBalanceChange, updatedTransaction.account_id, TEMP_USER_ID]
    );

    if (finalUpdateAccountResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'New associated account not found or does not belong to user. Transaction update rolled back.' });
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Transaction updated and account balance adjusted successfully!',
      transaction: updatedTransaction,
      updatedAccountBalance: finalUpdateAccountResult.rows[0].balance,
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error updating transaction:', error.stack);
    res.status(500).json({
      message: 'Failed to update transaction',
      error: error.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.delete('/transactions/:id', async (req, res) => {
  const { id } = req.params;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const transactionToDeleteResult = await client.query(
      'SELECT account_id, amount, type FROM transactions WHERE id = $1 AND user_id = $2;',
      [id, TEMP_USER_ID]
    );

    if (transactionToDeleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found or does not belong to user.' });
    }
    const transactionToDelete = transactionToDeleteResult.rows[0];

    const deleteResult = await client.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id;',
      [id, TEMP_USER_ID]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found or could not be deleted.' });
    }

    const reverseBalanceChange = transactionToDelete.type === 'income' ? -transactionToDelete.amount : transactionToDelete.amount;
    const updateAccountResult = await client.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, balance;',
      [reverseBalanceChange, transactionToDelete.account_id, TEMP_USER_ID]
    );

    if (updateAccountResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: 'Associated account not found or could not be updated after transaction deletion. Data inconsistency detected.' });
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Transaction deleted and account balance adjusted successfully!',
      id: id,
      updatedAccountBalance: updateAccountResult.rows[0].balance,
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error deleting transaction:', error.stack);
    res.status(500).json({
      message: 'Failed to delete transaction',
      error: error.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.get('/categories', async (req, res) => {
  try {
    const allCategories = await pool.query(
      'SELECT id, name, type, created_at, updated_at FROM categories WHERE user_id = $1 ORDER BY name ASC;',
      [TEMP_USER_ID]
    );
    res.json({ categories: allCategories.rows });
  } catch (err) {
    console.error('Error fetching categories:', err.stack);
    res.status(500).json({ message: 'Failed to fetch categories', error: err.message });
  }
});

app.post('/categories', async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ message: 'Missing required category fields (name, type).' });
  }
  if (!['income', 'expense'].includes(type.toLowerCase())) {
      return res.status(400).json({ message: 'Category type must be "income" or "expense".' });
  }

  try {
    const newCategory = await pool.query(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING id, name, type, created_at, updated_at;',
      [TEMP_USER_ID, name, type]
    );
    res.status(201).json({ message: 'Category added successfully!', category: newCategory.rows[0] });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'categories_user_id_name_type') {
      return res.status(409).json({ message: `Category '${name}' of type '${type}' already exists for this user.` });
    }
    console.error('Error adding category:', err.stack);
    res.status(500).json({ message: 'Failed to add category', error: err.message });
  }
});

app.get('/lending-borrowing', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lending_borrowing WHERE user_id = $1 ORDER BY date DESC, created_at DESC;',
      [TEMP_USER_ID]
    );
    res.json({ entries: result.rows });
  } catch (err) {
    console.error('Error fetching lending/borrowing entries:', err.stack);
    res.status(500).json({ message: 'Failed to fetch entries', error: err.message });
  }
});

app.post('/lending-borrowing', async (req, res) => {
  const { type, person, amount, date, due_date, status, notes } = req.body;
  if (!type || !person || !amount || !date) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO lending_borrowing (user_id, type, person, amount, date, due_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [TEMP_USER_ID, type, person, amount, date, due_date || null, status || 'outstanding', notes || null]
    );
    res.status(201).json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Error adding entry:', err.stack);
    res.status(500).json({ message: 'Failed to add entry', error: err.message });
  }
});

app.put('/lending-borrowing/:id', async (req, res) => {
  const { id } = req.params;
  const { type, person, amount, date, due_date, status, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE lending_borrowing SET
        type = COALESCE($1, type),
        person = COALESCE($2, person),
        amount = COALESCE($3, amount),
        date = COALESCE($4, date),
        due_date = COALESCE($5, due_date),
        status = COALESCE($6, status),
        notes = COALESCE($7, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9
       RETURNING *;`,
      [type, person, amount, date, due_date, status, notes, id, TEMP_USER_ID]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Entry not found.' });
    }
    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Error updating entry:', err.stack);
    res.status(500).json({ message: 'Failed to update entry', error: err.message });
  }
});

app.delete('/lending-borrowing/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM lending_borrowing WHERE id = $1 AND user_id = $2 RETURNING id;',
      [id, TEMP_USER_ID]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Entry not found.' });
    }
    res.json({ message: 'Entry deleted successfully!', id });
  } catch (err) {
    console.error('Error deleting entry:', err.stack);
    res.status(500).json({ message: 'Failed to delete entry', error: err.message });
  }
});

app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

app.listen(port, () => {
  console.log(`Perfin Backend listening at http://localhost:${port}`);
  console.log(`Open http://localhost:${port} in your browser.`);
  console.log(`Test DB connection at http://localhost:${port}/test-db`);
  console.log(`Accounts API: /accounts`);
  console.log(`Transactions API: /transactions`);
  console.log(`Budgets API: /budgets`);
  console.log(`Categories API: /categories`);
  console.log(`Lending/Borrowing API: /lending-borrowing`);
});