import socket
from common_ports import ports_and_services as services


# This function looks for IP and URL for verbose output
def url_or_ip(input_str):
  if input_str[0].isdigit():
    # If input is an IP address
    try:
      # Try to pack IP adress to see if its valid
      packed_ip = socket.inet_aton(input_str)
      try:
        # If IP is valid try to get host name
        url = socket.gethostbyaddr(input_str)[0]
        url = f'{url} ({input_str})'
      except:
        url = input_str
      return (input_str, url)
    except:
      return (False, 'Error: Invalid IP address')
  else:
    # Input is not valid IP address, assume its URL
    try:
      ip = socket.gethostbyname(input_str)
      url = f'{input_str} ({ip})'
      return (ip, url)
    except:
      return (False, 'Error: Invalid hostname')

# Main function, get open ports in given range
def get_open_ports(target, port_range, verbose = False):
  ip, host_string = url_or_ip(target)

  # If invalid URL or IP return error
  if ip == False:
    return host_string
    
  open_ports = []
  s = []

  for i in range(port_range[0], port_range[1] + 1):
    s.append(socket.socket(socket.AF_INET, socket.SOCK_STREAM))
    s[-1].settimeout(0.5)
    
    if s[-1].connect_ex((target, i)) == 0:
      open_ports.append(i);

  # Close all open sockets
  for i in range(len(s)):
    s[i].close()

  if verbose == True:    
    open_ports_verbose = f'Open ports for {host_string}\n'
    open_ports_verbose += 'PORT     SERVICE'
    for i in range(len(open_ports)):
      open_ports_verbose += f'\n{str(open_ports[i]):<8} {services[open_ports[i]]}'

    return open_ports_verbose  
  
  return open_ports