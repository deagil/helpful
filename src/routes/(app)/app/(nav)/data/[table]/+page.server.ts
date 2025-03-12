import { error } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

export async function load({ locals, params, url }) {
  const { user, supabaseServiceRole } = locals;
  const { table } = params;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Fetch the encrypted database connection string
  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) {
    throw error(500, 'Failed to retrieve database configuration');
  }

  // Decrypt the config to get the connection string
  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;

  if (!connectionString) {
    throw error(500, 'Database connection string not found');
  }

  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  let client;
  try {
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;

    client = new Client({
      connectionString,
      ssl,
    });

    await client.connect();

    // Fetch table records and config in parallel
    const [recordsRes, countRes, configRes] = await Promise.all([
      client.query(
        `SELECT * FROM public.${table} LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      client.query(`SELECT COUNT(*) AS total FROM public.${table}`),
      client.query(`SELECT * FROM vh_tables WHERE name = $1`, [table])
    ]);

    const totalRecords = parseInt(countRes.rows[0].total, 10);
    const tableConfig = configRes.rows.length ? configRes.rows[0] : null;

    console.log(`Total records in table ${table}:`, totalRecords);
    console.log(`Config for table ${table}:`, tableConfig);
    console.log(`Fetched ${JSON.stringify(recordsRes.rows[0])} records from table ${table}`);


    await client.end();

    return {
      records: recordsRes.rows,
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      tableConfig, // Include table configuration
    };
  } catch (err) {
    console.error(`Error fetching records from table ${table}:`, err);
    if (client) {
      await client.end();
    }
    throw error(500, `Failed to fetch records from ${table}`);
  }
}