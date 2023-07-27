import hashlib

def crack_sha1_hash(hash_to_check, use_salts = False):
  # Read file with 1000 most common passwords
  with open('top-10000-passwords.txt', 'r') as file:
    top_passwords = [line.rstrip('\n') for line in file]

  # Read file with known salts
  with open('known-salts.txt', 'r') as file:
    known_salts = [line.rstrip('\n') for line in file]
    
  # Iterate over known common passwords to find math
  for password in top_passwords:
    h = hashlib.new('sha1')  
    password_to_hash = password.encode('utf-8')
    h.update(password_to_hash)
    hashed_password = h.hexdigest()
    if hashed_password == hash_to_check:
      return password

    # Iterate over known salts (appended salt)
    if use_salts == True:
      for salt in known_salts:
        h = hashlib.new('sha1') 
        password_to_hash = (password + salt).encode('utf-8')
        h.update(password_to_hash)
        hashed_password = h.hexdigest()
        if hashed_password == hash_to_check:
          return password

    # Iterate over known salts (prepended salt)
    if use_salts == True:
      for salt in known_salts:
        h = hashlib.new('sha1') 
        password_to_hash = (salt + password).encode('utf-8')
        h.update(password_to_hash)
        hashed_password = h.hexdigest()
        if hashed_password == hash_to_check:
          return password
          
  # Password cracking failed, none found
  return 'PASSWORD NOT IN DATABASE'
