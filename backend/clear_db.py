"""
Clear all MongoDB collections EXCEPT roles and permissions
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Collections to KEEP (not delete)
PROTECTED_COLLECTIONS = [
    'roles',
    'permissions', 
    'role_permissions',
    'system_settings'
]

async def clear_database():
    # Connect to MongoDB
    mongo_url = "mongodb+srv://abshar:C4oWeDhJcSMpmqeq@cluster0.k6iwxga.mongodb.net/?appName=Cluster0"
    db_name = "milescapitals"
    
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=30000)
    db = client[db_name]
    
    print(f"Connected to database: {db_name}")
    print(f"Protected collections (will NOT be cleared): {PROTECTED_COLLECTIONS}")
    print("-" * 50)
    
    # Get all collections
    collections = await db.list_collection_names()
    print(f"Found {len(collections)} collections")
    
    cleared_count = 0
    skipped_count = 0
    
    for coll_name in collections:
        if coll_name in PROTECTED_COLLECTIONS:
            count = await db[coll_name].count_documents({})
            print(f"  SKIPPED: {coll_name} ({count} documents) - Protected")
            skipped_count += 1
        else:
            # Get count before deletion
            count = await db[coll_name].count_documents({})
            # Delete all documents in collection
            result = await db[coll_name].delete_many({})
            print(f"  CLEARED: {coll_name} - Deleted {result.deleted_count} documents")
            cleared_count += 1
    
    print("-" * 50)
    print(f"Summary:")
    print(f"  Collections cleared: {cleared_count}")
    print(f"  Collections skipped (protected): {skipped_count}")
    print("\nDatabase cleanup complete!")
    
    # Also clear Redis cache
    try:
        import redis
        redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)
        redis_client.flushdb()
        print("Redis cache cleared!")
    except Exception as e:
        print(f"Redis clear skipped: {e}")

if __name__ == "__main__":
    asyncio.run(clear_database())
